from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from urllib.parse import urlsplit
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas import SubscriptionBase
from app.models.enums import SubscriptionStatus, CancellationStatus, RefundStatus

CURRENCIES = {"USD", "EUR", "TRY", "GBP", "KGS"}


class SubscriptionInput(SubscriptionBase):
    amount_minor: int = Field(ge=0, le=10**12, strict=True)
    notes: str | None = Field(None, max_length=4000)
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE

    @model_validator(mode="after")
    def valid(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Name is required")
        if self.interval.value == "custom_days" and not self.interval_days:
            raise ValueError("Custom interval requires interval_days")
        if self.is_trial or self.status == SubscriptionStatus.TRIAL:
            if not self.trial_end_date:
                raise ValueError("Trial end date is required")
            if self.anchor_date < self.trial_end_date:
                raise ValueError("First billing date must be on or after trial end")
            self.is_trial = True
            if self.status == SubscriptionStatus.ACTIVE:
                self.status = SubscriptionStatus.TRIAL
        if self.cancellation_url:
            u = urlsplit(self.cancellation_url)
            if u.scheme != "https" or not u.hostname or u.username or u.password:
                raise ValueError(
                    "Cancellation URL must be a public HTTPS URL without credentials"
                )
        if not date(1900, 1, 1) <= self.anchor_date <= date(2200, 1, 1):
            raise ValueError("Billing date outside supported range")
        return self


class Preferences(BaseModel):
    timezone: str = "UTC"
    primary_currency: str = "TRY"
    locale: str = "en"
    reminder_days_before: int = Field(3, ge=0, le=30)
    trial_reminder_days_before: int = Field(2, ge=0, le=30)
    quiet_hours_start: int = Field(22, ge=0, le=23)
    quiet_hours_end: int = Field(8, ge=0, le=23)
    notifications_enabled: bool = True

    @field_validator("timezone")
    @classmethod
    def tz(cls, v):
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown timezone")
        return v

    @field_validator("primary_currency")
    @classmethod
    def currency(cls, v):
        if v not in CURRENCIES:
            raise ValueError("Unsupported currency")
        return v

    @field_validator("locale")
    @classmethod
    def locale_valid(cls, v):
        if v not in ("en", "ru", "tr"):
            raise ValueError("Unsupported language")
        return v


class CancellationInput(BaseModel):
    status: CancellationStatus = CancellationStatus.PLANNED
    planned_for: date | None = None
    reference_note: str | None = Field(None, max_length=4000)


class RefundInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    subscription_id: int | None = None
    amount_minor: int = Field(ge=0, le=10**12, strict=True)
    currency: str
    charged_on: date
    reason: str = Field(min_length=1, max_length=4000)
    next_follow_up_on: date | None = None
    _currency = field_validator("currency")(Preferences.currency.__func__)


class RefundUpdate(BaseModel):
    status: RefundStatus
    next_follow_up_on: date | None = None
    note: str = Field("", max_length=4000)


class PaymentInput(BaseModel):
    amount_minor: int = Field(ge=0, le=10**12, strict=True)
    charged_on: date
    was_expected: bool = True
    note: str | None = Field(None, max_length=4000)
