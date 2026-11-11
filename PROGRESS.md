# Verified progress — SubGuard

## Release 0.1.0 — SUBGUARD_001

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
rates exist. Evidence uploads, provider integrations and automatic demo
retention are not implemented. Inherited category/activity tables remain extension points.


## 0.2.0 — SUBGUARD_002 (2026-11-10)

User confirmed that their initial functional checks worked; they prioritized CSV import
and form usability after a blue redesign and soft animations.

- Replaced charcoal/sage identity with a cobalt rail, light work surfaces and blue accents.
- Added short page/card/modal/chart transitions and hover/press feedback, with complete
  reduced-motion support. Visually inspected desktop 1440px and mobile 390px screenshots.
- Trial checkbox/status stay synchronized. Moving trial end later adjusts an earlier
  first paid date. Paid-date explanation and late-cancellation warning are localized.
- Localized API failure messages; accepted decimal commas; added empty search feedback.
- Implemented UTF-8 CSV import: bounds, delimiter/quoted-field parsing, column mapping,
  preview, row selection, validation, account-isolated duplicate detection, atomic commit
  and a transaction lock against concurrent repeat imports. No schema change.
- Verification: **32 PostgreSQL backend tests**, **3 frontend unit tests**, **6 production
  Docker Playwright scenarios** passed; TypeScript/Vite build succeeded. All pre-existing
  functional browser scenarios still pass. Python lint passed before packaging.
- Pytest inside the non-root image initially reported cache permission warnings; configured
  its disposable cache under /tmp. Test execution itself passed.
- Live Telegram/Windows/production restore acceptance remains as documented above.

### Example CSV
Added downloads/subscriptions_example.csv: four explicitly fictional subscriptions, including annual billing and a trial. Verified with the actual importer: all four rows ready, automatic column mapping successful. No application code change.


## Portfolio preparation and Telegram onboarding (2026-11-11)

- Added README screenshot/engineering evidence, a full-stack case study, API walkthrough
  with generated OpenAPI snapshot (22 paths), and a Russian 2–3 minute demo script.
- Added GitHub Actions jobs for backend/migrations, frontend build/unit tests and Docker
  browser scenarios. Workflow YAML parsed locally; hosted Actions results are not yet verified.
- Added safe local configuration generation and bounded HTTP readiness checks. Verified
  generation, restrictive permissions and preservation of an existing .env.
- Verified pg_dump/pg_restore of the application schema and a synthetic user in unique
  temporary databases; original application data was not dumped or changed. This is
  recovery-tooling evidence, not validation of a production backup or disaster-recovery plan.
- Frontend unit/build commands rerun locally. No application behavior changed in this work.
- User has no server/domain yet. Added a Windows/Cloudflare Quick Tunnel + BotFather guide;
  tunnel installation, real Telegram delivery and public hosting remain unverified.

## External hosting preparation (2026-11-11)

- User reports that the local Cloudflare tunnel and Telegram bot work. This was not
  independently checked from the development environment.
- Added a production Compose override with Caddy TLS proxy, plus a Russian deployment
  guide. Compose configuration and Caddyfile syntax were validated locally.
- No external server, stable hostname or hosting account is available. The user requires
  an external, free, always-on host without a bank card. No provider's current free-tier
  terms were verified, and no public deployment has been performed.

## Static portfolio showcase (2026-11-11)

- The user chose a free, public interface preview after Oracle declined their card.
- Added an explicit static mode with fictional records and tab-scoped browser state;
  no production API, Telegram login or notification request is made by that mode.
- Local production builds of full and static variants passed; three frontend unit tests
  passed. Three Chromium scenarios
  passed against the static production build: desktop navigation/local editing/reload
  without API calls, mobile refund view/draft/no horizontal overflow, and CSV
  preview/import using the sample file.
- A GitHub Pages workflow and guide were prepared for static hosting.
- Hosted workflow run 43070624404 reached the Pages configuration step and failed with
  `HttpError: Resource not accessible by integration` while attempting to create the
  Pages site. The repository owner enabled **Settings → Pages → GitHub Actions**.
- Follow-up workflow run 43071377681 completed successfully and displayed the deployment
  URL `https://aydenxvi.github.io/subguard/`. Direct HTTP reachability from this
  restricted development environment was not checked (`github.io` is blocked by its
  network policy). The user should open the published URL in a normal browser.

## Showcase visitor journey (2026-11-11)

- Added clear entry buttons, a three-step guide and a shareable `#bot` link on the public
  landing page. The Telegram-style conversation is explicitly labelled as a simulation;
  it reproduces the configured bot command copy without sending messages.
- Captured four reproducible Russian-language portfolio screenshots using the static
  production build: landing, bot simulation, desktop app and mobile app.
- Static build, normal frontend build, 3 unit tests and 5 Chromium showcase scenarios
  passed locally. GitHub Pages workflow run 43073465936 completed successfully and
  reported `https://aydenxvi.github.io/subguard/` for this version. Direct HTTP access
  from the managed environment remains blocked by its network policy.

## Portfolio images (2026-11-11)

- Captured a 16:9 cover and additional real showcase screens for subscriptions, the
  trial form, analytics and refunds. The fictional refund record is localized for
  RU screenshots. The bot image remains visibly labelled as a simulation.
- Added a recommended upload order and a downloadable PNG bundle. Browser/unit checks
  and both frontend builds passed before packaging; screenshots were inspected locally.
- Public ZIP download was verified byte-for-byte against the local archive. GitHub Pages
  workflow run 43075213744 completed successfully after the updated showcase build.

## Owner-supplied screenshot gallery (2026-11-11)

- Inspected the owner's ZIP: 14 valid images, seven English desktop PNGs and seven
  Russian mobile JPEGs. OCR and representative visual inspection found only fictional
  portfolio data and no obvious secrets. Original image bytes were preserved.
- Added a public landing-page gallery with localized captions and full-size links, plus
  repository copies under `docs/screenshots/owner/`.
- Local validation: three frontend unit tests, normal and showcase builds, and six
  Chromium showcase scenarios passed. The new scenario loads all 14 images and checks
  full-size links. A visual review caught and fixed a missing arrow glyph; the gallery
  scenario passed again after that change.
- GitHub Pages workflow run 43082817131 completed successfully for commit c227ba6 and
  reported `https://aydenxvi.github.io/subguard/`. Direct HTTP inspection of that
  domain remains unavailable from this managed environment.
