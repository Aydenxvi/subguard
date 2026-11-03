"""Billing date and money math.

Rules enforced here (see CLAUDE.md):
  * Money is always integer minor units. No floats anywhere in stored values.
  * "Monthly" is calendar-month arithmetic, clamped to month end -- never "+30 days".
  * Amounts in different currencies are never summed without an explicit rate.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from app.models.enums import BillingInterval

MONTHS_PER_INTERVAL: dict[BillingInterval, int] = {
    BillingInterval.MONTHLY: 1,
    BillingInterval.QUARTERLY: 3,
    BillingInterval.SEMIANNUAL: 6,
    BillingInterval.ANNUAL: 12,
}

# Average days per month over a 4-year cycle: 1461 / 48.
DAYS_PER_MONTH = 1461 / 48  # 30.4375


def last_day_of_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def add_months(anchor: date, months: int) -> date:
    """Add calendar months, clamping the day to the target month's last day.

    2025-01-31 + 1 month -> 2025-02-28 (not 2025-03-03).
    The anchor day is preserved for later steps by callers that keep the original
    anchor_date, so a Jan-31 subscription returns to 31 in months that have it.
    """
    total = (anchor.year * 12 + (anchor.month - 1)) + months
    year, month = divmod(total, 12)
    month += 1
    day = min(anchor.day, last_day_of_month(year, month))
    return date(year, month, day)


def interval_step(
    anchor: date,
    interval: BillingInterval,
    index: int,
    interval_days: int | None = None,
) -> date:
    """The `index`-th billing date counted from `anchor` (index 0 == anchor)."""
    if interval is BillingInterval.WEEKLY:
        return anchor + timedelta(weeks=index)
    if interval is BillingInterval.CUSTOM_DAYS:
        if not interval_days or interval_days < 1:
            raise ValueError(
                "interval_days is required and must be >= 1 for CUSTOM_DAYS"
            )
        return anchor + timedelta(days=interval_days * index)
    months = MONTHS_PER_INTERVAL.get(interval)
    if months is None:
        raise ValueError(f"Unsupported interval: {interval}")
    return add_months(anchor, months * index)


def next_billing_date(
    anchor: date,
    interval: BillingInterval,
    *,
    today: date,
    interval_days: int | None = None,
    inclusive: bool = True,
) -> date:
    """First billing date on/after `today`, derived from the original anchor.

    Deriving every date from the anchor (rather than repeatedly advancing the previous
    result) is what keeps month-end subscriptions correct: a 31st anchor stays on the
    31st in long months instead of drifting to the 28th forever.
    """
    if interval is BillingInterval.CUSTOM_DAYS and (
        not interval_days or interval_days < 1
    ):
        raise ValueError("interval_days is required and must be >= 1 for CUSTOM_DAYS")

    def reached(candidate: date) -> bool:
        return candidate >= today if inclusive else candidate > today

    if reached(anchor):
        return anchor

    # Estimate the index, then correct. Cheap and exact for all supported intervals.
    delta_days = (today - anchor).days
    if interval is BillingInterval.WEEKLY:
        index = max(delta_days // 7, 0)
    elif interval is BillingInterval.CUSTOM_DAYS:
        index = max(delta_days // int(interval_days), 0)  # type: ignore[arg-type]
    else:
        months = MONTHS_PER_INTERVAL[interval]
        index = max(int(delta_days // (DAYS_PER_MONTH * months)) - 1, 0)

    candidate = interval_step(anchor, interval, index, interval_days)
    guard = 0
    while not reached(candidate):
        index += 1
        candidate = interval_step(anchor, interval, index, interval_days)
        guard += 1
        if guard > 1000:  # pragma: no cover - defensive
            raise RuntimeError("next_billing_date failed to converge")
    return candidate


def advance_billing_date(
    anchor: date,
    interval: BillingInterval,
    current: date,
    interval_days: int | None = None,
) -> date:
    """The billing date strictly after `current`, still derived from the anchor."""
    return next_billing_date(
        anchor, interval, today=current, interval_days=interval_days, inclusive=False
    )


def monthly_equivalent_minor(
    amount_minor: int, interval: BillingInterval, interval_days: int | None = None
) -> int:
    """Normalize a recurring amount to an integer monthly-equivalent in minor units.

    Half-up rounding on the final minor unit only; the input stays an integer throughout.
    """
    if interval is BillingInterval.WEEKLY:
        numerator, denominator = amount_minor * 52, 12
    elif interval is BillingInterval.CUSTOM_DAYS:
        if not interval_days or interval_days < 1:
            raise ValueError(
                "interval_days is required and must be >= 1 for CUSTOM_DAYS"
            )
        numerator, denominator = amount_minor * 1461, interval_days * 48
    else:
        months = MONTHS_PER_INTERVAL.get(interval)
        if months is None:
            raise ValueError(f"Unsupported interval: {interval}")
        numerator, denominator = amount_minor, months
    return (numerator * 2 + denominator) // (denominator * 2)


def annual_equivalent_minor(
    amount_minor: int, interval: BillingInterval, interval_days: int | None = None
) -> int:
    if interval is BillingInterval.WEEKLY:
        return amount_minor * 52
    if interval is BillingInterval.CUSTOM_DAYS:
        if not interval_days or interval_days < 1:
            raise ValueError("interval_days must be positive")
        n, d = amount_minor * 1461, interval_days * 4
    else:
        n, d = amount_minor * 12, MONTHS_PER_INTERVAL[interval]
    return (n * 2 + d) // (d * 2)


@dataclass(frozen=True)
class CurrencyTotal:
    currency: str
    amount_minor: int


def sum_by_currency(items: list[tuple[str, int]]) -> list[CurrencyTotal]:
    """Group amounts per currency. Deliberately returns one total per currency:
    SubGuard never collapses currencies into one number without an explicit,
    user-visible exchange rate."""
    buckets: dict[str, int] = {}
    for currency, amount_minor in items:
        buckets[currency] = buckets.get(currency, 0) + amount_minor
    return [CurrencyTotal(c, buckets[c]) for c in sorted(buckets)]


def days_until(target: date, *, today: date) -> int:
    return (target - today).days
