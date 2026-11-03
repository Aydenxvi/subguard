import enum


class BillingInterval(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"
    CUSTOM_DAYS = "custom_days"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class CancellationStatus(str, enum.Enum):
    PLANNED = "planned"
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class RefundStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    AWAITING_REPLY = "awaiting_reply"
    ESCALATED = "escalated"
    APPROVED = "approved"
    REJECTED = "rejected"
    CLOSED = "closed"


class NotificationKind(str, enum.Enum):
    TRIAL_ENDING = "trial_ending"
    RENEWAL_UPCOMING = "renewal_upcoming"
    CANCELLATION_DEADLINE = "cancellation_deadline"
    REFUND_FOLLOW_UP = "refund_follow_up"
    MONTHLY_REVIEW = "monthly_review"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"
