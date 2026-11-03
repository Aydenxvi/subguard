# Architecture and guarantees

React → same-origin nginx `/api` → FastAPI → PostgreSQL 16. The bot and reminder worker
share the backend service/model layer and database. Alembic creates the schema before
API/worker startup. There is no in-memory substitute for persistence.

## Original code retained

The original commit `458564c` supplied SQLAlchemy entities, Pydantic schemas, configuration,
calendar billing helpers and Telegram HMAC helpers. Those remain the foundation. New API,
validation, migrations, jobs, bot, UI and tests were added. Billing and authentication bugs
were fixed rather than replacing the architecture. The original roadmap’s completion
claims were contradicted by its source tree and have been replaced with verified progress.

## Authentication and isolation

Telegram initData is checked with Telegram’s HMAC-SHA256 algorithm and constant-time
comparison. Duplicate keys, expired timestamps, timestamps more than 30 seconds into
the future and invalid user IDs are rejected. The default maximum age is 5 minutes.
A seven-day signed JWT contains the internal user ID. The secret must be at least 32
characters. Ownership checks happen in queries for subscriptions, payments, cancellations,
refunds, history, reminder activity and retries. A random negative Telegram ID identifies
each isolated demo account. Advisory locks serialize concurrent first Telegram logins.

A valid Telegram initData can be reused within its short validity window. This is not
an OAuth one-time code. Keep HTTPS end-to-end, tokens out of logs and the JWT key private.
The browser keeps its bearer token in sessionStorage; XSS prevention therefore matters.
React escapes text, provider links are HTTPS-only, and nginx supplies a restrictive CSP.
Auth endpoints have nginx request limits. Do not expose the native backend directly on
an untrusted network without equivalent request-size/rate limits and TLS.

## Money and dates

All five supported currencies use two decimal minor units. Amounts are integers up to
10^12 minor units; decimal input is parsed from text. Monthly recurrence uses the original
anchor, clamped to month end; January 31 → February 28/29 → March 31. Annual estimates
are calculated directly, avoiding multiplication of a rounded monthly figure. Custom-day
normalization uses the exact ratio 1461/48 days/month. Weekly normalization assumes 52
payments/year. These are *normalized estimates*, not actual period transaction totals.
Recorded payment totals contain only manually entered charges. Different currencies are
never added together or converted with invented rates. Preferred currency only selects
new-entry defaults, not a hidden conversion rate.

A trial’s first paid date must be on or after its end date. Trial dates are not inferred
from provider policies. Expired trials display as active paid subscriptions unless the
user pauses/cancels them. A payment record does not change the recurrence anchor.

## Reminders

Each job has a unique user/kind/subject/event-date key. The worker checks every 30 seconds,
creates jobs from current subscriptions/refunds and inserts with ON CONFLICT DO NOTHING.
A PostgreSQL transaction advisory lock serializes schedulers; due jobs are row-locked.
Successful jobs are retained for deduplication. Pending/failed jobs are regenerated when
relevant records or preferences change. Disabling reminders cancels pending delivery.

Scheduling starts at 09:00 in the user’s timezone, adjusted to the end of quiet hours.
Equal quiet start/end disables quiet hours. Cross-midnight windows and DST are tested.
Delayed jobs are attempted only through the event’s local calendar day; obsolete jobs
are cancelled rather than sending stale deadline advice. Expired refund follow-up dates
should be advanced by the user after review. The worker catches up within this window.

Failures retry with exponential delays (up to one hour), up to eight attempts. A failed
job can be retried from settings while its event is current/future. Telegram errors are
sanitized so bot tokens are not logged. Demo jobs can appear as scheduled but are never
sent. Without a bot token, live jobs remain pending; this is not successful delivery.

**Delivery is at least once, not exactly once.** Telegram sendMessage has no idempotency
key. A process crash after Telegram accepts a message and before the DB commit can cause
a duplicate. The transaction protects routine concurrent delivery, not that distributed
failure window. Monitor worker errors and failed jobs. A single loop is appropriate for
this release; load/large-scale delivery throughput has not been benchmarked.

## Refund and cancellation records

Cancellation status is supplied by the user; only confirmation changes subscription
status to cancelled. Confirmation notes are user records, not proof obtained from providers.
Refund requests are localized templates that quote entered facts and ask the provider to
assess eligibility. Status changes append history events; no status implies SubGuard
independently verified a refund. No attachment upload or automated support messages exist.
