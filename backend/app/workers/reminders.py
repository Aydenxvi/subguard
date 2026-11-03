"""Persistent reminders. Delivery is at-least-once: Telegram has no idempotency key."""
import asyncio, logging
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import httpx
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from app.db.session import SessionLocal
from app.core.config import settings
from app.models.core import User, UserSettings, Subscription, RefundCase, NotificationJob
from app.models.enums import JobStatus, NotificationKind, SubscriptionStatus, RefundStatus
from app.services.billing import next_billing_date

log=logging.getLogger(__name__)
UTC=timezone.utc

def outside_quiet(now, prefs):
    local=now.astimezone(ZoneInfo(prefs.timezone))
    start,end=prefs.quiet_hours_start,prefs.quiet_hours_end
    quiet=(start<=local.hour<end) if start<end else (local.hour>=start or local.hour<end) if start>end else False
    if quiet:
        day=local.date()+timedelta(days=1 if start>end and local.hour>=start else 0)
        local=datetime.combine(day,time(end),tzinfo=local.tzinfo)
    return local.astimezone(UTC)

def reminder_text(locale,kind,name,target):
    labels={
        'en':{'renewal_upcoming':'Renewal approaching','trial_ending':'Trial ending','cancellation_deadline':'Cancellation deadline','refund_follow_up':'Refund follow-up'},
        'ru':{'renewal_upcoming':'Скоро продление','trial_ending':'Пробный период заканчивается','cancellation_deadline':'Срок отмены','refund_follow_up':'Проверить возврат'},
        'tr':{'renewal_upcoming':'Yenileme yaklaşıyor','trial_ending':'Deneme bitiyor','cancellation_deadline':'İptal son tarihi','refund_follow_up':'İade takibi'}}
    return f"SubGuard · {labels.get(locale,labels['en'])[kind.value]}\n{name} · {target.isoformat()}"

async def schedule(db,now):
    pairs=(await db.execute(select(User,UserSettings).join(UserSettings,UserSettings.user_id==User.id).where(UserSettings.notifications_enabled==True))).all()
    for user,prefs in pairs:
        today=now.astimezone(ZoneInfo(prefs.timezone)).date()
        subs=(await db.scalars(select(Subscription).where(Subscription.user_id==user.id,Subscription.status.in_([SubscriptionStatus.ACTIVE,SubscriptionStatus.TRIAL])))).all()
        candidates=[]
        for s in subs:
            renew=next_billing_date(s.anchor_date,s.interval,today=today,interval_days=s.interval_days)
            candidates.append((NotificationKind.RENEWAL_UPCOMING,s.id,None,s.name,renew,prefs.reminder_days_before))
            if s.is_trial and s.trial_end_date: candidates.append((NotificationKind.TRIAL_ENDING,s.id,None,s.name,s.trial_end_date,prefs.trial_reminder_days_before))
            if s.cancel_before_date: candidates.append((NotificationKind.CANCELLATION_DEADLINE,s.id,None,s.name,s.cancel_before_date,prefs.reminder_days_before))
        refunds=(await db.scalars(select(RefundCase).where(RefundCase.user_id==user.id,RefundCase.next_follow_up_on.is_not(None),RefundCase.status.notin_([RefundStatus.CLOSED,RefundStatus.APPROVED,RefundStatus.REJECTED])))).all()
        candidates += [(NotificationKind.REFUND_FOLLOW_UP,None,r.id,r.title,r.next_follow_up_on,0) for r in refunds]
        for kind,sid,rid,name,target,lead in candidates:
            if target<today: continue
            due=outside_quiet(datetime.combine(target-timedelta(days=lead),time(9),tzinfo=ZoneInfo(prefs.timezone)),prefs)
            key=f'{user.id}:{kind.value}:{sid or 0}:{rid or 0}:{target}'
            stmt=insert(NotificationJob).values(user_id=user.id,subscription_id=sid,refund_case_id=rid,kind=kind,due_at=due,subject_date=target,dedupe_key=key,payload_text=reminder_text(prefs.locale,kind,name,target),status=JobStatus.PENDING,attempts=0).on_conflict_do_nothing(index_elements=['dedupe_key'])
            await db.execute(stmt)

async def telegram_send(chat_id,message):
    async with httpx.AsyncClient(timeout=20) as client:
        result=await client.post(f'https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage',json={'chat_id':chat_id,'text':message})
        if result.status_code != 200:
            # Never include the URL (contains token) or raw response in logs.
            raise RuntimeError(f'Telegram HTTP {result.status_code}')
        if not result.json().get('ok'): raise RuntimeError('Telegram rejected message')

async def tick(now=None,send=telegram_send):
    now=now or datetime.now(UTC)
    async with SessionLocal() as db:
        # Serializes scheduler instances; jobs are also row-locked against updates.
        lock=await db.scalar(text('SELECT pg_try_advisory_xact_lock(73944291)'))
        if not lock: return
        await schedule(db,now)
        jobs=(await db.scalars(select(NotificationJob).where(NotificationJob.status==JobStatus.PENDING,NotificationJob.due_at<=now).order_by(NotificationJob.due_at).limit(100).with_for_update(skip_locked=True))).all()
        for job in jobs:
            user=await db.get(User,job.user_id)
            prefs=await db.scalar(select(UserSettings).where(UserSettings.user_id==job.user_id))
            if user.is_demo: continue
            if not prefs.notifications_enabled or job.subject_date<now.astimezone(ZoneInfo(prefs.timezone)).date():
                job.status=JobStatus.CANCELLED;continue
            ready=outside_quiet(now,prefs)
            if ready>now: job.due_at=ready;continue
            if not settings.telegram_bot_token and send is telegram_send: continue
            job.attempts+=1
            try:
                await send(user.telegram_id,job.payload_text)
                job.status=JobStatus.SENT;job.sent_at=now;job.last_error=None
            except Exception:
                job.last_error='Delivery failed; verify bot access and network'
                job.due_at=now+timedelta(seconds=min(3600,30*2**min(job.attempts,7)))
                if job.attempts>=8: job.status=JobStatus.FAILED
        await db.commit()

async def main():
    logging.basicConfig(level=logging.INFO)
    while True:
        try: await tick()
        except Exception as exc: log.error('Reminder tick failed: %s',type(exc).__name__)
        await asyncio.sleep(30)

if __name__=='__main__': asyncio.run(main())
