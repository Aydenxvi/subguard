# CLAUDE.md — SubGuard Permanent Project Instructions

> Read this file first in every resumed session. Then read PROGRESS.md, ROADMAP.md and
> NEXT_STEPS.md, run `git status`, and inspect the source tree before writing any code.
> Never restart the project, recreate finished components, or delete working code.
> When the user says "Continue SubGuard", resume immediately from NEXT_STEPS.md.

## What SubGuard Is

SubGuard is a subscription-protection and recurring-payment organization platform,
delivered as a Telegram bot + Telegram Mini App + FastAPI backend. It helps people:

1. See what subscriptions they're paying for.
2. Know when each one renews.
3. Decide what to cancel before the next charge.
4. Organize a refund request if an unwanted charge already happened.

It is explicitly **not** an auto-canceller or a money-recovery service — it gives
visibility, reminders and organization, never a guarantee. Never add messaging or
features that imply automatic cancellation or guaranteed refunds unless a real,
authorized integration exists.

## Architecture Summary

- **`backend/`** — FastAPI + SQLAlchemy 2.x (async) + PostgreSQL + Alembic. Owns all
  business logic, including billing-schedule math and currency handling. Telegram
  `initData` is verified server-side (HMAC-SHA256 against the bot token) — never trust
  `initDataUnsafe` from the client.
- **`bot/`** — aiogram 3.x. Thin layer: commands, keyboards, reminder delivery. No
  business logic lives here; it calls the backend's internal API/service layer.
- **`frontend/`** — React + TypeScript + Vite + Tailwind + shadcn-style components +
  TanStack Query + React Hook Form + Zod + Recharts + date-fns. Telegram Mini App via
  `@telegram-apps/sdk` (or `window.Telegram.WebApp`), with a separate browser demo mode
  that needs no Telegram auth.
- **Background jobs** — durable, database-backed reminder scheduling (a `NotificationJob`
  table), not an in-memory scheduler. Idempotent delivery, retries, timezone-aware.

See ARCHITECTURE.md for schema and decision details.

## Hard Rules (do not violate)

- Never invent cancellation URLs, exchange rates, payment confirmations, refund outcomes,
  or provider policies. If unknown, say so in the UI and ask the user to verify.
- Never claim a test passed without running it.
- Never store full card numbers, bank passwords, or card PINs.
- Enforce per-user data isolation on every query (ownership checks at the query layer).
- Money is stored in minor units (integer cents/kuruş) per currency — never float.
- Do not sum amounts across currencies without an explicit, user-visible exchange rate.
- Billing-date math must handle month-end and DST correctly — never "+30 days" for
  "monthly".
- No payment processing in the MVP. No dark patterns, ever — SubGuard is anti-dark-pattern
  by brand promise.

## Session Workflow

After every meaningful unit of work:
1. Save source files.
2. Update PROGRESS.md (what's done) and NEXT_STEPS.md (what's next, concretely).
3. Record test results actually observed (or note tests not yet run).
4. Record known issues.
5. Append to CHANGELOG.md.
6. Commit with a clear message when the tree is in a runnable state.

Do not wait for an entire phase to finish before saving progress.

## Current Phase

See PROGRESS.md for the authoritative, up-to-date status.
