# API walkthrough

[OpenAPI snapshot](openapi.json) is generated from the application. For interactive
request documentation, run the native backend and open its `/docs` route. The public
nginx configuration exposes `/api`, not the development docs UI.

## A reviewer’s first flow

1. POST `/api/auth/demo` with `{"seed":false}` creates an isolated demo user and returns
   an access token. This route must be enabled by DEMO_MODE_ENABLED.
2. Send that token as `Authorization: Bearer <your session token>` to private routes.
3. POST `/api/subscriptions` with the body below. Money uses integer minor units.
4. GET `/api/subscriptions` and `/api/analytics` to inspect persistence and calculations.
5. DELETE `/api/demo` deletes only that authenticated demo account and its dependent data.

```json
{
  "name": "Portfolio example",
  "amount_minor": 999,
  "currency": "USD",
  "interval": "monthly",
  "anchor_date": "2026-12-01",
  "status": "active"
}
```

For Telegram, POST `/api/auth/telegram` with `{"init_data":"<raw Telegram initData>"}`.
Do not send a standalone Telegram user ID as proof of identity. Do not put tokens into
URLs or copy them into screenshots, Git history or portfolio examples.

## Route groups

| Group | Operations |
|---|---|
| Authentication | POST `/auth/demo`, POST `/auth/telegram`, GET `/me` |
| Preferences | PUT `/settings` |
| Subscriptions | GET/POST `/subscriptions`, PUT/DELETE `/subscriptions/{id}` |
| Payments | POST `/subscriptions/{id}/payments`, DELETE `/payments/{id}` |
| Analytics | GET `/analytics` |
| Cancellation | GET `/cancellations`, POST `/subscriptions/{id}/cancellation` |
| Refunds | GET/POST `/refunds`, PUT `/refunds/{id}`, GET `/refunds/{id}/events`, GET `/refunds/{id}/message` |
| Reminders | GET `/notifications`, POST `/notifications/{id}/retry` |
| CSV import | POST `/import/subscriptions/preview`, POST `/import/subscriptions` |

Paths in the table are prefixed with `/api`. Private records are scoped to the session
user. A record owned by another account returns 404. Invalid input returns 422; missing
or invalid sessions return 401. Preview does not save records; import validates again.

## Read the implementation

- `backend/app/main.py`: HTTP routes and ownership queries.
- `backend/app/api/validation.py`: application input constraints.
- `backend/app/core/security.py`: Telegram signatures and session tokens.
- `backend/app/services/billing.py`: anchor-based recurrence and money normalization.
- `backend/app/services/csv_import.py`: bounded CSV parsing and duplicate identities.
- `backend/tests/`: executable examples including forbidden cross-user access.

The OpenAPI snapshot describes current request models and endpoints. Not every response
has an explicit Pydantic response schema yet; improving response contracts is a concrete
future code-quality task, not an already completed claim.
