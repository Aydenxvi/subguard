# Changelog

## 0.2.0 — SUBGUARD_002 — 2026-11-10

- New light/cobalt visual identity and soft, reduced-motion-aware transitions.
- Trial form date synchronization, status/checkbox consistency, local error messages,
  decimal-comma amounts, cancellation warning and empty filtered results.
- CSV subscription import with column mapping, preview, selection and server-side
  duplicate prevention, including repeat/concurrent import protection.
- Added CSV API and browser regression tests; 32 backend, 3 unit and 6 E2E checks passed.
- No database schema change; existing Docker volume and .env must be preserved on update.

## 0.1.0 — SUBGUARD_001 — 2026-11-03

- Preserved original backend foundation commit and corrected false roadmap claims.
- Added FastAPI routes, PostgreSQL/Alembic persistence and per-user ownership enforcement.
- Hardened Telegram validation against duplicate keys, future timestamps and malformed IDs.
- Fixed annual rounding and custom-day calculations while preserving calendar anchors.
- Implemented subscription CRUD, trial tracking, payment recording/export, cancellations,
  refund cases/history and EN/RU/TR request drafts.
- Added durable reminders, timezone/quiet-hour handling, retries and aiogram commands.
- Built responsive React Mini App, browser demo/reset, localized UI and financial charts.
- Added Docker Compose, non-root backend image, nginx proxy/security headers, config templates,
  Windows instructions, deployment/backup documentation and automated tests.
- Verified 26 backend tests, 3 frontend unit tests, 3 browser scenarios, production build,
  migration reversibility/schema consistency and database persistence after restart.
- Documented unverified live Telegram/Windows acceptance and optional future features.

### Sample data
- Added a UTF-8 CSV example with four fictional subscription records, validated by the importer.
