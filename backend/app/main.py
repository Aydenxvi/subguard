from datetime import date, datetime, timedelta, timezone
from secrets import randbelow
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Depends, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, delete, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import (
    verify_init_data,
    parse_telegram_user,
    create_access_token,
    decode_access_token,
    InitDataError,
)
from app.db.session import get_db
from app.models.core import (
    User,
    UserSettings,
    Subscription,
    SubscriptionCategory,
    CancellationRecord,
    RefundCase,
    RefundEvent,
    PaymentRecord,
    NotificationJob,
)
from app.models.enums import SubscriptionStatus, JobStatus
from app.schemas import (
    AuthRequest,
    DemoAuthRequest,
    UserOut,
    SubscriptionOut,
    UserSettingsOut,
)
from app.api.validation import (
    SubscriptionInput,
    Preferences,
    CancellationInput,
    RefundInput,
    RefundUpdate,
    PaymentInput,
)
from app.services.billing import (
    next_billing_date,
    monthly_equivalent_minor,
    annual_equivalent_minor,
    sum_by_currency,
)

app = FastAPI(title="SubGuard", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
bearer = HTTPBearer(auto_error=False)


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    try:
        if credentials is None:
            raise InitDataError("Missing session")
        claims = decode_access_token(credentials.credentials)
        uid = int(claims["sub"])
    except (InitDataError, ValueError, KeyError):
        raise HTTPException(401, "Invalid or expired session")
    user = await db.scalar(
        select(User).where(User.id == uid).options(selectinload(User.settings))
    )
    if not user or (user.is_demo and not settings.demo_mode_enabled):
        raise HTTPException(401, "Session unavailable")
    return user


def local_today(user):
    return datetime.now(ZoneInfo(user.settings.timezone)).date()


async def owned(db, model, obj_id, user):
    obj = await db.scalar(
        select(model).where(model.id == obj_id, model.user_id == user.id)
    )
    if obj is None:
        raise HTTPException(404, "Not found")
    return obj


def row(obj):
    return {
        c.name: getattr(obj, c.name)
        for c in obj.__table__.columns
        if c.name != "user_id"
    }


async def all_subs(db, user):
    return list(
        (
            await db.scalars(
                select(Subscription)
                .where(Subscription.user_id == user.id)
                .options(selectinload(Subscription.category))
                .order_by(Subscription.id.desc())
            )
        ).all()
    )


def sub_out(s, today):
    result = SubscriptionOut.model_validate(s)
    result.next_billing_date = next_billing_date(
        s.anchor_date, s.interval, today=today, interval_days=s.interval_days
    )
    result.days_until_billing = (result.next_billing_date - today).days
    if s.is_trial and s.trial_end_date and s.trial_end_date < today:
        result.is_trial = False
        if result.status == SubscriptionStatus.TRIAL:
            result.status = SubscriptionStatus.ACTIVE
    result.monthly_equivalent_minor = monthly_equivalent_minor(
        s.amount_minor, s.interval, s.interval_days
    )
    return result


@app.get("/api/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post("/api/auth/telegram")
async def telegram_auth(body: AuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        identity = parse_telegram_user(verify_init_data(body.init_data))
    except (InitDataError, TypeError, ValueError):
        raise HTTPException(401, "Invalid Telegram authorization")
    # Transaction-scoped lock serializes first login for the same Telegram account.
    if db.bind.dialect.name == "postgresql":
        await db.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": identity.telegram_id}
        )
    user = await db.scalar(
        select(User)
        .where(User.telegram_id == identity.telegram_id)
        .options(selectinload(User.settings))
    )
    if not user:
        locale = (
            identity.language_code[:2]
            if identity.language_code[:2] in ("en", "ru", "tr")
            else "en"
        )
        user = User(
            telegram_id=identity.telegram_id,
            first_name=identity.first_name,
            username=identity.username,
            language_code=locale,
            settings=UserSettings(locale=locale),
        )
        db.add(user)
        await db.flush()
    await db.commit()
    return {
        "access_token": create_access_token(user.id),
        "user": UserOut.model_validate(user),
    }


@app.post("/api/auth/demo")
async def demo_auth(body: DemoAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.demo_mode_enabled:
        raise HTTPException(403, "Demo disabled")
    user = User(
        telegram_id=-(randbelow(2**62) + 1),
        first_name="Explorer",
        is_demo=True,
        settings=UserSettings(),
    )
    db.add(user)
    await db.flush()
    if body.seed:
        today = date.today()
        for name, amount, currency, days, trial in [
            ("Cinema Club", 1499, "USD", 5, False),
            ("Cloud Workspace", 899, "USD", 12, False),
            ("Language Studio", 24900, "TRY", 3, True),
        ]:
            d = today + timedelta(days=days)
            db.add(
                Subscription(
                    user_id=user.id,
                    name=name,
                    amount_minor=amount,
                    currency=currency,
                    interval="monthly",
                    anchor_date=d,
                    next_billing_date=d,
                    is_trial=trial,
                    trial_end_date=d if trial else None,
                    status=SubscriptionStatus.TRIAL
                    if trial
                    else SubscriptionStatus.ACTIVE,
                )
            )
    await db.commit()
    return {
        "access_token": create_access_token(user.id, is_demo=True),
        "user": UserOut.model_validate(user),
    }


@app.delete("/api/demo")
async def reset_demo(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not user.is_demo:
        raise HTTPException(403, "Demo only")
    await db.delete(user)
    await db.commit()
    return {"deleted": True}


@app.get("/api/me")
async def me(user=Depends(current_user)):
    return UserOut.model_validate(user)


@app.put("/api/settings")
async def preferences(
    body: Preferences, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    for k, v in body.model_dump().items():
        setattr(user.settings, k, v)
    await invalidate_jobs(db, user.id)
    await db.commit()
    return UserSettingsOut.model_validate(user.settings)


@app.get("/api/categories")
async def categories(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return [row(c) for c in (await db.scalars(select(SubscriptionCategory))).all()]


@app.get("/api/subscriptions")
async def subscriptions(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return [sub_out(s, local_today(user)) for s in await all_subs(db, user)]


async def validate_category(db, body):
    if body.category_id and not await db.get(SubscriptionCategory, body.category_id):
        raise HTTPException(422, "Unknown category")


async def invalidate_jobs(db, uid, sid=None, rid=None):
    q = delete(NotificationJob).where(
        NotificationJob.user_id == uid,
        NotificationJob.status.in_([JobStatus.PENDING, JobStatus.FAILED]),
    )
    if sid is not None:
        q = q.where(NotificationJob.subscription_id == sid)
    if rid is not None:
        q = q.where(NotificationJob.refund_case_id == rid)
    await db.execute(q)


@app.post("/api/subscriptions", status_code=201)
async def create_sub(
    body: SubscriptionInput,
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await validate_category(db, body)
    s = Subscription(
        user_id=user.id,
        **body.model_dump(),
        next_billing_date=next_billing_date(
            body.anchor_date,
            body.interval,
            today=local_today(user),
            interval_days=body.interval_days,
        ),
    )
    db.add(s)
    await db.commit()
    await db.refresh(s, ["category"])
    return sub_out(s, local_today(user))


@app.put("/api/subscriptions/{sid}")
async def update_sub(
    sid: int,
    body: SubscriptionInput,
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    s = await owned(db, Subscription, sid, user)
    await validate_category(db, body)
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    s.next_billing_date = next_billing_date(
        s.anchor_date,
        s.interval,
        today=local_today(user),
        interval_days=s.interval_days,
    )
    await invalidate_jobs(db, user.id, sid=sid)
    await db.commit()
    await db.refresh(s, ["category"])
    return sub_out(s, local_today(user))


@app.delete("/api/subscriptions/{sid}", status_code=204)
async def delete_sub(
    sid: int, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    s = await owned(db, Subscription, sid, user)
    await db.delete(s)
    await db.commit()
    return Response(status_code=204)


@app.get("/api/analytics")
async def analytics(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    subs = await all_subs(db, user)
    today = local_today(user)
    active = [
        s
        for s in subs
        if s.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL)
    ]
    upcoming = sorted(
        [sub_out(s, today).model_dump() for s in active],
        key=lambda s: s["next_billing_date"],
    )
    payments = list(
        (
            await db.scalars(
                select(PaymentRecord)
                .where(PaymentRecord.user_id == user.id)
                .order_by(PaymentRecord.charged_on.desc())
            )
        ).all()
    )
    return {
        "active_count": len(active),
        "trial_count": sum(
            bool(s.is_trial and s.trial_end_date and s.trial_end_date >= today)
            for s in active
        ),
        "monthly_totals": sum_by_currency(
            [
                (
                    s.currency,
                    monthly_equivalent_minor(
                        s.amount_minor, s.interval, s.interval_days
                    ),
                )
                for s in active
            ]
        ),
        "annual_totals": sum_by_currency(
            [
                (
                    s.currency,
                    annual_equivalent_minor(
                        s.amount_minor, s.interval, s.interval_days
                    ),
                )
                for s in active
            ]
        ),
        "upcoming": upcoming,
        "recorded_totals": sum_by_currency(
            [(p.currency, p.amount_minor) for p in payments]
        ),
        "payments": [row(p) for p in payments],
        "by_subscription": [
            {
                "name": s.name,
                "currency": s.currency,
                "amount_minor": monthly_equivalent_minor(
                    s.amount_minor, s.interval, s.interval_days
                ),
            }
            for s in active
        ],
    }


@app.post("/api/subscriptions/{sid}/payments", status_code=201)
async def payment(
    sid: int,
    body: PaymentInput,
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    s = await owned(db, Subscription, sid, user)
    p = PaymentRecord(
        user_id=user.id, subscription_id=s.id, currency=s.currency, **body.model_dump()
    )
    db.add(p)
    await db.commit()
    return row(p)


@app.delete("/api/payments/{pid}", status_code=204)
async def delete_payment(
    pid: int, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    p = await owned(db, PaymentRecord, pid, user)
    await db.delete(p)
    await db.commit()
    return Response(status_code=204)


@app.get("/api/cancellations")
async def cancellations(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return [
        row(c)
        for c in (
            await db.scalars(
                select(CancellationRecord)
                .where(CancellationRecord.user_id == user.id)
                .order_by(CancellationRecord.id.desc())
            )
        ).all()
    ]


@app.post("/api/subscriptions/{sid}/cancellation")
async def cancellation(
    sid: int,
    body: CancellationInput,
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    s = await owned(db, Subscription, sid, user)
    c = await db.scalar(
        select(CancellationRecord)
        .where(
            CancellationRecord.subscription_id == sid,
            CancellationRecord.user_id == user.id,
        )
        .order_by(CancellationRecord.id.desc())
        .limit(1)
    )
    if c and c.status.value == "confirmed" and body.status.value != "confirmed":
        if s.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL):
            c = None
        else:
            raise HTTPException(
                409,
                "Confirmed cancellation is final; reactivate the subscription separately",
            )
    if not c:
        c = CancellationRecord(user_id=user.id, subscription_id=sid)
        db.add(c)
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    if body.status.value == "confirmed":
        c.confirmed_on = local_today(user)
        s.status = SubscriptionStatus.CANCELLED
    else:
        s.cancel_before_date = body.planned_for
    await invalidate_jobs(db, user.id, sid=sid)
    await db.commit()
    return row(c)


@app.get("/api/refunds")
async def refunds(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return [
        row(c)
        for c in (
            await db.scalars(
                select(RefundCase)
                .where(RefundCase.user_id == user.id)
                .order_by(RefundCase.id.desc())
            )
        ).all()
    ]


@app.post("/api/refunds", status_code=201)
async def create_refund(
    body: RefundInput, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    if body.subscription_id:
        await owned(db, Subscription, body.subscription_id, user)
    c = RefundCase(user_id=user.id, **body.model_dump())
    db.add(c)
    await db.commit()
    return row(c)


@app.put("/api/refunds/{rid}")
async def update_refund(
    rid: int,
    body: RefundUpdate,
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await owned(db, RefundCase, rid, user)
    c.status = body.status
    c.next_follow_up_on = body.next_follow_up_on
    db.add(
        RefundEvent(
            refund_case_id=rid,
            happened_on=local_today(user),
            kind=body.status.value,
            body=body.note,
        )
    )
    await invalidate_jobs(db, user.id, rid=rid)
    await db.commit()
    return row(c)


@app.get("/api/refunds/{rid}/events")
async def events(
    rid: int, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    await owned(db, RefundCase, rid, user)
    return [
        row(e)
        for e in (
            await db.scalars(
                select(RefundEvent)
                .where(RefundEvent.refund_case_id == rid)
                .order_by(RefundEvent.id)
            )
        ).all()
    ]


@app.get("/api/refunds/{rid}/message")
async def refund_message(
    rid: int,
    locale: str = Query("en", pattern="^(en|ru|tr)$"),
    user=Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await owned(db, RefundCase, rid, user)
    amount = f"{c.amount_minor // 100}.{c.amount_minor % 100:02d} {c.currency}"
    templates = {
        "en": f"Hello,\nI would like to request a review of the {amount} charge dated {c.charged_on} for {c.title}.\nReason: {c.reason}\nPlease let me know whether a refund is available under your policy and what supporting information you require. Thank you.",
        "ru": f"Здравствуйте!\nПрошу рассмотреть возврат списания {amount} от {c.charged_on} за {c.title}.\nПричина: {c.reason}\nСообщите, пожалуйста, возможен ли возврат по вашим правилам и какие подтверждающие сведения нужны. Спасибо.",
        "tr": f"Merhaba,\n{c.title} için {c.charged_on} tarihli {amount} tutarındaki ödemenin iadesini değerlendirmenizi rica ediyorum.\nGerekçe: {c.reason}\nPolitikanıza göre iadenin mümkün olup olmadığını ve hangi belgelerin gerekli olduğunu bildirir misiniz? Teşekkürler.",
    }
    return {"message": templates[locale]}


@app.get("/api/notifications")
async def notifications(user=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return [
        row(j)
        for j in (
            await db.scalars(
                select(NotificationJob)
                .where(NotificationJob.user_id == user.id)
                .order_by(NotificationJob.due_at.desc())
                .limit(100)
            )
        ).all()
    ]


@app.post("/api/notifications/{jid}/retry")
async def retry_notification(
    jid: int, user=Depends(current_user), db: AsyncSession = Depends(get_db)
):
    job = await owned(db, NotificationJob, jid, user)
    if job.status != JobStatus.FAILED or job.subject_date < local_today(user):
        raise HTTPException(
            409, "Only failed reminders for current or future dates can be retried"
        )
    job.status = JobStatus.PENDING
    job.attempts = 0
    job.last_error = None
    job.due_at = datetime.now(timezone.utc)
    await db.commit()
    return row(job)
