# Resume from this checkpoint

SUBGUARD_002 (0.2.0) implements the usable core application. Read PROGRESS.md for tested
scope. Preserve the existing code and Git history; do not restart the project.

1. To run: follow README.md, fill .env locally, then `docker compose up --build -d`.
2. For Telegram acceptance: supply TELEGRAM_BOT_TOKEN and public HTTPS MINI_APP_URL securely;
   start the telegram Compose profile and execute docs/TESTING.md's manual checklist.
   No live Telegram result is claimed yet.
3. Test Docker Desktop on Windows and restore a backup in a disposable target environment.
4. For a public service: choose demo retention and delivery monitoring policies; benchmark
   the worker before scaling. Review the documented at-least-once delivery boundary.
5. Pick optional extensions from ROADMAP.md only when requested. Do not mark them complete
   because an inherited table or enum exists.

If producing another release archive, use SUBGUARD_003.zip, then sequential numbering.
Use meaningful commits and rerun only checks affected by subsequent changes. Tests require
an isolated PostgreSQL database; never downgrade a database containing user data.

User-selected CSV import and form improvements are complete in 0.2.0. Remaining optional extensions: refund evidence uploads, sourced FX conversion, provider catalog, monthly reviews and retention/scale work. Do not claim these completed.

For a ready-to-import sample use downloads/subscriptions_example.csv; replace its fictional values before tracking real expenses.


Current priority: user wants a full-stack portfolio and a first Telegram launch. They have
no VPS/domain. Follow docs/TELEGRAM_RU.md for a temporary test on their own Windows machine;
never request bot tokens in chat. For permanent hosting, obtain the user's target and
configure secrets securely. GitHub Actions hosted outcome remains unverified. Portfolio
case study, API snapshot and walkthrough are prepared. App release remains 0.2.0 until
an application change; the next downloadable package is SUBGUARD_003.
