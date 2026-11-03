from datetime import datetime, timezone, date
from types import SimpleNamespace
from app.workers.reminders import outside_quiet, reminder_text
from app.models.enums import NotificationKind

def test_quiet_hours_and_dst():
    p=SimpleNamespace(timezone='Europe/Berlin',quiet_hours_start=22,quiet_hours_end=8)
    # Overnight DST change: 08:00 CEST is 06:00 UTC.
    assert outside_quiet(datetime(2026,3,28,22,tzinfo=timezone.utc),p)==datetime(2026,3,29,6,tzinfo=timezone.utc)
    p.quiet_hours_start=p.quiet_hours_end=8
    now=datetime(2026,3,28,22,tzinfo=timezone.utc)
    assert outside_quiet(now,p)==now

def test_notification_locales():
    for lang in ('en','ru','tr'):
        assert 'Studio' in reminder_text(lang,NotificationKind.TRIAL_ENDING,'Studio',date(2026,1,1))

async def test_scheduler_dedup_retry_and_send(monkeypatch):
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from app.core.config import settings
    from app.models.core import User, UserSettings, Subscription, NotificationJob
    from app.models.enums import SubscriptionStatus, BillingInterval, JobStatus
    from app.workers import reminders
    from secrets import randbelow
    engine=create_async_engine(settings.database_url)
    sessions=async_sessionmaker(engine,expire_on_commit=False)
    monkeypatch.setattr(reminders,'SessionLocal',sessions)
    now=datetime(2026,11,3,12,tzinfo=timezone.utc)
    async with sessions() as db:
        u=User(telegram_id=randbelow(10**12)+1,is_demo=False,settings=UserSettings(timezone='UTC'))
        db.add(u);await db.flush();uid=u.id
        db.add(Subscription(user_id=uid,name='Worker test',amount_minor=100,currency='USD',interval=BillingInterval.MONTHLY,anchor_date=date(2026,11,5),next_billing_date=date(2026,11,5),status=SubscriptionStatus.ACTIVE))
        await db.commit()
    delivered=[]
    async def fail(chat,msg): raise RuntimeError('network unavailable')
    async def send(chat,msg): delivered.append(msg)
    await reminders.tick(now,send=fail)
    async with sessions() as db:
        jobs=(await db.scalars(select(NotificationJob).where(NotificationJob.user_id==uid))).all()
        assert len(jobs)==1 and jobs[0].attempts==1 and jobs[0].status==JobStatus.PENDING
    from datetime import timedelta
    await reminders.tick(now+timedelta(minutes=5),send=send)
    await reminders.tick(now+timedelta(minutes=6),send=send)
    assert len(delivered)==1
    async with sessions() as db:
        u=await db.get(User,uid);await db.delete(u);await db.commit()
    await engine.dispose()
