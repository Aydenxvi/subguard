# Verified roadmap

The archive’s original checklist contained inaccurate claims. Source audit found only
configuration, models, schemas, billing helpers and auth helpers in commit `458564c`.

- [x] Phase 1: API, secure auth, migrations, PostgreSQL, billing and ownership tests.
- [x] Phase 2: durable reminder worker, bot implementation, cancellations and refunds.
- [x] Phase 3: responsive React application, EN/RU/TR, isolated demo and analytics.
- [x] Phase 4: Docker deployment, automated checks, documentation and source packaging.

“Implemented” does not mean external integrations have been live-tested. PROGRESS.md
contains exact evidence. Live Telegram and Windows Desktop acceptance remain below.

## Operational acceptance requiring deployment configuration

- [ ] Configure a test bot and HTTPS Mini App URL; verify actual login and delivery.
- [ ] Exercise Docker Desktop on Windows.
- [ ] Verify backup restore and fresh deployment in the target production environment.

## Optional extensions

- [x] CSV import with preview, column mapping, selection and duplicate protection (0.2.0).
- [ ] Refund evidence uploads with private storage and access controls.
- [ ] Explicit sourced FX conversion, provider catalog and verified cancellation links.
- [ ] Monthly review notifications and usage-based suggestions (no usage data is invented).
- [ ] Automatic demo retention and higher-throughput notification delivery.
