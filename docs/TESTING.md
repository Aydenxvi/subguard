# Testing

Run backend tests only against a dedicated PostgreSQL database. Tests create and delete
records. They use real PostgreSQL, not SQLite. Networked Telegram is replaced by an
injected delivery function in automated tests; its live behavior is a separate check.

## Docker backend tests (all desktop platforms)

With the regular stack up, create a disposable database once:

```text
docker compose exec db createdb -U subguard subguard_test
```

Run this command from Bash or PowerShell (single quotes keep the variable expansion
inside the container):

```text
docker compose run --rm --no-deps api sh -c 'export DATABASE_URL="${DATABASE_URL}_test"; alembic upgrade head && python -m pytest -q'
```

Do not append `_test` twice. If `subguard_test` already exists, reuse it; do not drop
an unknown database. The standard Compose DATABASE_URL ends in `/subguard`.

Native equivalent, from `backend`, after providing your own test DATABASE_URL and JWT_SECRET:

```text
alembic upgrade head
python -m pytest -q
alembic check
```

On an empty/disposable test database only, verify rollback with `alembic downgrade base`
then `alembic upgrade head`. This is destructive; never do it on user data.

## Frontend

From `frontend`:

```text
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

The E2E default expects Vite on 5173 and a running API on 8000. To test the production
Compose site instead, set `E2E_URL=http://127.0.0.1:8080` in the process environment.
If an existing compatible Chromium is installed, set CHROMIUM_PATH to its executable.
For PowerShell: `$env:E2E_URL = 'http://127.0.0.1:8080'`, then `npm run test:e2e`.
Do not disable browser certificate checks to fix deployment problems.

Tests cover exact decimal parsing, locale key completeness, demo persistence across
reload, CRUD, payment entry, cancellation confirmation, refund drafts, language switching,
preferences, demo reset and mobile overflow/navigation. Backend checks include ownership
isolation, invalid input, real signed Telegram payloads, forged sessions, calendar month-end,
annual rounding, quiet-hour DST, durable deduplication and retry/success behavior.

## Manual live Telegram acceptance

Not automated and not claimed verified without credentials:

1. Use a dedicated test bot and consenting test account. Set public HTTPS MINI_APP_URL.
2. `/start`, open the app and verify a non-demo account appears.
3. Add a subscription due today and enable notifications outside quiet hours.
4. Confirm actual Telegram receipt and a SENT job in settings.
5. `/stop` and verify the settings switch reflects disabled notifications after refresh.
6. Test `/reminders`, a trial deadline and a refund follow-up on test records.
7. Close/reopen Telegram and verify the same user data remains.

Never confuse a passing mocked delivery test with actual Telegram delivery.
