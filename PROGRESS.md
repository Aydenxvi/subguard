# Verified progress — SUBGUARD_001 / 0.1.0

## Audit

The supplied ZIP contained one commit (`458564c`) and only backend foundation code.
There were no routes, app entry point, migration, frontend, bot or tests. Its roadmap
incorrectly marked many of those complete. Original history and usable code are retained.
No previous completion claim was used as evidence.

## Implemented

1. FastAPI API, PostgreSQL persistence, Alembic migration, Telegram HMAC auth and private
   expiring sessions; isolated demo accounts; calendar-safe billing and validation.
2. Subscription CRUD, trial deadlines, manual charge records, cancellation tracking,
   refund cases/history/localized drafts and currency-separated analytics.
3. PostgreSQL reminder scheduling, event deduplication, retries, quiet hours/timezones,
   failed-job retry; aiogram commands and actual Telegram API delivery code.
4. React/TypeScript/Vite/Tailwind interface; responsive navigation, EN/RU/TR, demo/reset,
   functional forms and charts; CSV payment export.
5. Docker Compose with db/migration/API/worker/web and optional bot; configuration template,
   Windows-friendly commands, deployment, backup and testing documentation.

## Observed verification (2026-11-03)

- **26 backend tests passed** on dedicated PostgreSQL 16: CRUD, ownership, validation,
  signed Telegram login, forged-session rejection, multicurrency, refund lifecycle,
  reminder retries/deduplication, DST and EN/RU/TR bot command rendering.
- **3 frontend unit tests passed**: exact minor-unit conversion and locale coverage.
- **3 Playwright scenarios passed** against the production Docker site: core end-to-end
  workflow, mobile navigation/overflow, and trial edit/delete. The first two also passed
  against native Vite/API during development.
- TypeScript check and Vite production build passed. Python Ruff checks passed.
- Alembic upgrade → downgrade → upgrade passed on a disposable database; `alembic check`
  reported no new operations. These operations were never run on user data.
- Docker images built; migration exited 0; API/database healthy; worker/web running.
- A control subscription survived restart of db/API/worker/web; the test account was removed.
- Chromium smoke inspection observed no uncaught page errors and no mobile horizontal overflow.

Failures encountered and fixed: async SQLAlchemy timestamp refresh during serialization,
accessible select labels, demo-reset navigation, CSS closing brace, Vitest accidentally
collecting Playwright tests, and non-root Docker image file permissions.

## Explicitly not verified

- Live Telegram login/delivery in a real Mini App: no bot token/public HTTPS deployment
  was supplied. Unit tests use signed fixture data and an injected notification transport.
- Docker Desktop on a physical Windows machine; tested Docker platform was Linux.
- Public deployment, production load, backup restore and fresh-cloud snapshot restoration.

## Boundaries

Delivery is at least once; an acknowledgment/commit crash can duplicate a Telegram message.
No automatic cancellation, refund submission, bank sync, guaranteed refunds or invented FX
rates exist. Optional CSV import, evidence uploads, provider integrations and automatic demo
retention are not implemented. Inherited category/activity tables remain extension points.
