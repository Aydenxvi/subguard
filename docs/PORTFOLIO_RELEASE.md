# Portfolio release checklist

## Ready to show from the repository

- Runnable Docker application and an explicit browser demo.
- Desktop/mobile screenshots and EN/RU/TR interface.
- Source history, architecture rationale and a concrete case study.
- Dated local test evidence; runnable GitHub Actions workflow.
- Demonstration CSV, a 2–3 minute walkthrough and documented operational boundaries.

## Before calling it a live portfolio demo

1. Choose a hosting account and a domain you control. Configure HTTPS and the actual
   MINI_APP_URL/CORS origins. No hosting purchase or public deployment has been performed.
2. Create a separate demo bot; set its token securely in deployment settings.
3. Run the manual Telegram checklist in TESTING.md and record actual outcomes.
4. Open the public site from a clean browser and another device; test demo reset and reload.
5. Choose retention for abandoned demos, monitor failed reminders and configure backups.
6. Record the walkthrough in DEMO_SCRIPT_RU.md and add the real link to README.
7. Check the latest GitHub Actions run and address failures before advertising a green build.
8. Choose repository visibility and a license deliberately. No license grant or visibility
   change is made automatically; public visibility alone is not an open-source license.

## Recommended public repository description

Telegram Mini App for subscription and trial tracking — React, FastAPI, PostgreSQL,
durable reminders, CSV import, EN/RU/TR, Docker.

Suggested topics: telegram-mini-app, fastapi, react, typescript, postgresql, aiogram,
subscription-tracker, docker, playwright.

## What is not required to show this work

You do not need bank integrations, automated refund submissions or artificial usage
metrics. Show the implemented workflow clearly, explain its tradeoffs and distinguish
current evidence from future production plans. Evidence uploads, FX conversion and
other optional roadmap items can remain a clearly labeled future backlog.
