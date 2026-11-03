# Verified roadmap
The original checklist was inaccurate. Audit: only config, models, schemas, billing
helpers and auth helpers existed in commit 458564c. No API, migrations, bot, frontend,
Docker deployment or tests existed. No Trial or RefundAttachment model existed.

- [x] Phase 1: API, secure auth, migrations, PostgreSQL, billing and isolation tests
- [x] Phase 2: durable reminders, Telegram bot, cancellations and refunds
- [x] Phase 3: responsive React application, EN/RU/TR, demo, analytics
- [ ] Phase 4: deployment, integration tests, documentation, release archive

Optional later enhancements: CSV mapping/import, evidence file uploads, automated FX
feeds, provider integrations. None is represented as implemented.

Phase 2 verification: worker scheduling/retry tested with injected transport; live Telegram delivery requires credentials and remains unverified.
