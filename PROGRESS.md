# Progress
Archive audited; original single commit preserved. Reusing SQLAlchemy entities,
Pydantic schemas and calendar-based billing helpers. Implementation in progress.

Phases 1–2: API, migration, worker and bot code implemented. PostgreSQL 16 migration applied. 20 backend tests passed, including ownership, validation, refund workflow, billing month-end, DST, deduplication and delivery retry with injected transport. Live Telegram not tested.
