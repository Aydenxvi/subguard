from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings
from app.models.enums import BillingInterval, RefundStatus, SubscriptionStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuthRequest(BaseModel):
    init_data: str = Field(..., description="Raw Telegram.WebApp.initData query string")


class DemoAuthRequest(BaseModel):
    seed: bool = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserSettingsOut(ORMModel):
    timezone: str
    primary_currency: str
    locale: str
    reminder_days_before: int
    trial_reminder_days_before: int
    quiet_hours_start: int
    quiet_hours_end: int
    notifications_enabled: bool


class UserSettingsUpdate(BaseModel):
    timezone: str | None = None
    primary_currency: str | None = None
    locale: str | None = None
    reminder_days_before: int | None = Field(default=None, ge=0, le=30)
    trial_reminder_days_before: int | None = Field(default=None, ge=0, le=30)
    quiet_hours_start: int | None = Field(default=None, ge=0, le=23)
    quiet_hours_end: int | None = Field(default=None, ge=0, le=23)
    notifications_enabled: bool | None = None


class UserOut(ORMModel):
    id: int
    telegram_id: int
    username: str | None
    first_name: str | None
    language_code: str
    is_demo: bool
    settings: UserSettingsOut | None = None


class CategoryOut(ORMModel):
    id: int
    slug: str
    name_en: str
    name_ru: str
    name_tr: str
    icon: str
    color: str


class SubscriptionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    provider: str | None = Field(default=None, max_length=128)
    notes: str | None = None
    amount_minor: int = Field(
        ..., ge=0, description="Integer minor units, e.g. 4999 = 49.99"
    )
    currency: str = Field(..., min_length=3, max_length=3)
    interval: BillingInterval
    interval_days: int | None = Field(default=None, ge=1, le=3650)
    anchor_date: date
    category_id: int | None = None
    is_trial: bool = False
    trial_end_date: date | None = None
    cancel_before_date: date | None = None
    cancellation_url: str | None = Field(default=None, max_length=512)
    payment_method_label: str | None = Field(default=None, max_length=64)

    @field_validator("currency")
    @classmethod
    def _currency_supported(cls, v: str) -> str:
        v = v.upper()
        if v not in settings.supported_currencies:
            raise ValueError(
                f"unsupported currency {v}; allowed: {settings.supported_currencies}"
            )
        return v

    @field_validator("payment_method_label")
    @classmethod
    def _no_full_card_numbers(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = [c for c in v if c.isdigit()]
        if len(digits) > 4:
            raise ValueError(
                "payment_method_label must not contain more than 4 digits "
                "(never store full card numbers)"
            )
        return v


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    provider: str | None = None
    notes: str | None = None
    amount_minor: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    interval: BillingInterval | None = None
    interval_days: int | None = Field(default=None, ge=1, le=3650)
    anchor_date: date | None = None
    category_id: int | None = None
    status: SubscriptionStatus | None = None
    is_trial: bool | None = None
    trial_end_date: date | None = None
    cancel_before_date: date | None = None
    cancellation_url: str | None = None
    payment_method_label: str | None = None


class SubscriptionOut(ORMModel):
    id: int
    name: str
    provider: str | None
    notes: str | None
    amount_minor: int
    currency: str
    interval: BillingInterval
    interval_days: int | None
    anchor_date: date
    next_billing_date: date
    status: SubscriptionStatus
    is_trial: bool
    trial_end_date: date | None
    cancel_before_date: date | None
    cancellation_url: str | None
    payment_method_label: str | None
    category: CategoryOut | None = None
    created_at: datetime

    # Derived, computed server-side so the client never does money math.
    monthly_equivalent_minor: int = 0
    days_until_billing: int = 0


class CurrencyTotalOut(BaseModel):
    currency: str
    amount_minor: int


class UpcomingItemOut(BaseModel):
    subscription_id: int
    name: str
    amount_minor: int
    currency: str
    billing_date: date
    days_until: int
    is_trial: bool


class DashboardOut(BaseModel):
    active_count: int
    trial_count: int
    cancelled_count: int
    # One total per currency. SubGuard never merges currencies without an explicit rate.
    monthly_totals: list[CurrencyTotalOut]
    annual_totals: list[CurrencyTotalOut]
    upcoming: list[UpcomingItemOut]
    trials_ending_soon: list[UpcomingItemOut]
    next_payment: UpcomingItemOut | None = None


class RefundCaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    amount_minor: int = Field(..., ge=0)
    currency: str = Field(..., min_length=3, max_length=3)
    subscription_id: int | None = None
    charged_on: date | None = None
    reason: str | None = None


class RefundCaseOut(ORMModel):
    id: int
    title: str
    amount_minor: int
    currency: str
    charged_on: date | None
    status: RefundStatus
    reason: str | None
    next_follow_up_on: date | None
    created_at: datetime


AuthResponse.model_rebuild()
