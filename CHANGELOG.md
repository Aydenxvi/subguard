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


## Portfolio and onboarding documentation — 2026-11-11
- Added full-stack case study, API snapshot, screenshots in README and demo walkthrough.
- Added CI configuration and local setup/readiness/recovery tooling.
- Verified isolated PostgreSQL schema + synthetic-row backup/restore.
- Documented first Telegram launch without a VPS/domain using a temporary local tunnel.

## External hosting preparation — 2026-11-11
- Added a production Compose override and Caddy HTTPS configuration for a server with
  a public hostname, plus Russian deployment instructions.
- Validated Compose and Caddyfile syntax. A hosted instance has not been provisioned.

## Static portfolio showcase — 2026-11-11
- Added an opt-in GitHub Pages build of the existing React UI with fictional, tab-local data.
- Clearly labeled the preview and disabled Telegram/API traffic in this build.
- Added a deployment workflow, Russian guide and desktop/mobile browser checks.
- GitHub Pages publication succeeded in workflow run 43071377681 after the owner
  enabled Pages in repository settings; direct HTTP verification is still pending.
- Added a guided landing page, a labelled interactive bot simulation with a direct
  `#bot` link, and four reproducible portfolio screenshots.
- Published the updated showcase in successful GitHub Pages run 43073465936.
