from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import (
    BillingInterval,
    CancellationStatus,
    JobStatus,
    NotificationKind,
    RefundStatus,
    SubscriptionStatus,
)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, index=True, nullable=False
    )
    username: Mapped[Optional[str]] = mapped_column(String(64))
    first_name: Mapped[Optional[str]] = mapped_column(String(128))
    last_name: Mapped[Optional[str]] = mapped_column(String(128))
    language_code: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    settings: Mapped[Optional["UserSettings"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    primary_currency: Mapped[str] = mapped_column(
        String(3), default="TRY", nullable=False
    )
    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    reminder_days_before: Mapped[int] = mapped_column(
        Integer, default=3, nullable=False
    )
    trial_reminder_days_before: Mapped[int] = mapped_column(
        Integer, default=2, nullable=False
    )
    quiet_hours_start: Mapped[int] = mapped_column(
        Integer, default=22, nullable=False
    )  # local hour
    quiet_hours_end: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="settings")


class SubscriptionCategory(Base, TimestampMixin):
    __tablename__ = "subscription_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(64), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    name_tr: Mapped[str] = mapped_column(String(64), nullable=False)
    icon: Mapped[str] = mapped_column(String(32), default="package", nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#7C5CFF", nullable=False)


class Subscription(Base, TimestampMixin):
    """A recurring payment the user is tracking.

    Money is stored in integer minor units (kurus/cents) of `currency`. Never float.
    """

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscription_categories.id", ondelete="SET NULL")
    )

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    provider: Mapped[Optional[str]] = mapped_column(String(128))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    interval: Mapped[BillingInterval] = mapped_column(
        SAEnum(BillingInterval, name="billing_interval"), nullable=False
    )
    interval_days: Mapped[Optional[int]] = mapped_column(
        Integer
    )  # only for CUSTOM_DAYS
    anchor_date: Mapped[date] = mapped_column(
        Date, nullable=False
    )  # first/base billing date
    next_billing_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)

    status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus, name="subscription_status"),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
    )

    is_trial: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trial_end_date: Mapped[Optional[date]] = mapped_column(Date)
    cancel_before_date: Mapped[Optional[date]] = mapped_column(Date)
    cancellation_url: Mapped[Optional[str]] = mapped_column(String(512))

    payment_method_label: Mapped[Optional[str]] = mapped_column(
        String(64)
    )  # e.g. "Visa ••4242"
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    category: Mapped[Optional["SubscriptionCategory"]] = relationship()


class PaymentRecord(Base, TimestampMixin):
    __tablename__ = "payment_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    charged_on: Mapped[date] = mapped_column(Date, nullable=False)
    was_expected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)


class CancellationRecord(Base, TimestampMixin):
    __tablename__ = "cancellation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[CancellationStatus] = mapped_column(
        SAEnum(CancellationStatus, name="cancellation_status"),
        default=CancellationStatus.PLANNED,
        nullable=False,
    )
    planned_for: Mapped[Optional[date]] = mapped_column(Date)
    confirmed_on: Mapped[Optional[date]] = mapped_column(Date)
    # User-entered only. SubGuard never invents provider cancellation URLs or policies.
    reference_note: Mapped[Optional[str]] = mapped_column(Text)


class RefundCase(Base, TimestampMixin):
    __tablename__ = "refund_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    charged_on: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[RefundStatus] = mapped_column(
        SAEnum(RefundStatus, name="refund_status"),
        default=RefundStatus.DRAFT,
        nullable=False,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text)
    next_follow_up_on: Mapped[Optional[date]] = mapped_column(Date)

    events: Mapped[list["RefundEvent"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class RefundEvent(Base, TimestampMixin):
    __tablename__ = "refund_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    refund_case_id: Mapped[int] = mapped_column(
        ForeignKey("refund_cases.id", ondelete="CASCADE"), index=True
    )
    happened_on: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # message_sent, reply, escalation
    body: Mapped[Optional[str]] = mapped_column(Text)

    case: Mapped["RefundCase"] = relationship(back_populates="events")


class NotificationJob(Base, TimestampMixin):
    """Durable, DB-backed reminder scheduling. Idempotent via (user, kind, subject, due_at)."""

    __tablename__ = "notification_jobs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "kind",
            "subscription_id",
            "due_at",
            name="uq_notification_idempotency",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE")
    )
    kind: Mapped[NotificationKind] = mapped_column(
        SAEnum(NotificationKind, name="notification_kind"), nullable=False
    )
    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, name="job_status"), default=JobStatus.PENDING, nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    dedupe_key: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    subject_date: Mapped[date] = mapped_column(Date, nullable=False)
    refund_case_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("refund_cases.id", ondelete="CASCADE")
    )
    payload_text: Mapped[Optional[str]] = mapped_column(Text)


class ActivityLog(Base, TimestampMixin):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(Text)
