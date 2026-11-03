# ROADMAP.md — SubGuard Development Checklist

Phases are internal milestones, not approval checkpoints. Continue to the next
unfinished item while execution capacity allows.

## Phase 1 — Foundation
- [x] Initialize repository
- [x] Directory layout (backend/bot/frontend/docs)
- [x] Persistent progress docs (this set of files)
- [x] Backend config + settings (pydantic-settings)
- [x] Database engine/session setup (async SQLAlchemy)
- [x] SQLAlchemy models for all core entities
- [x] Alembic configured with initial migration
- [x] Telegram `initData` HMAC verification (secure auth)
- [x] Bot skeleton: config, dispatcher, /start /help, main keyboard
- [x] Frontend scaffold: Vite + TS + Tailwind + design tokens (light/dark per spec palette)
- [x] Frontend routing shell + bottom nav + Telegram WebApp bootstrap + demo-mode fallback
- [x] Dashboard foundation (real API call, loading/empty states)
- [ ] CI-less local dev loop verified end-to-end (docker compose up) — **requires Docker,
      not available in this execution environment; documented in NEXT_STEPS.md**

## Phase 2 — Subscription MVP
- [x] Subscription CRUD (backend routes + schemas + service layer)
- [x] Subscription categories (seeded defaults)
- [x] Billing schedule calculation service (month-end safe, no "+30 days")
- [x] Upcoming payments query
- [x] Trial tracking fields on Subscription + Trial table
- [x] Dashboard metrics endpoint (monthly/annual cost, counts) from real data
- [ ] Frontend: Add/Edit subscription form (React Hook Form + Zod) — scaffolded, needs
      full field set + catalog picker
- [ ] Frontend: Subscriptions list with search/filter/sort/group

## Phase 3 — Notifications
- [ ] NotificationJob table + durable worker loop
- [ ] Idempotent delivery + retry handling
- [ ] Trial expiration / renewal / cancellation-deadline reminder generation
- [ ] Quiet hours + per-user timezone handling
- [ ] Bot delivery integration
- [ ] Settings UI for reminder preferences

## Phase 4 — Cancellation & Refunds
- [x] CancellationRecord model + status transitions (planned/requested/confirmed)
- [x] RefundCase / RefundEvent / RefundAttachment models
- [ ] Cancellation workflow endpoints + UI
- [ ] Refund Assistant UI
- [ ] Refund message generator (EN/RU/TR, multiple tones)
- [ ] Refund follow-up reminders

## Phase 5 — Advanced Features
- [ ] Spending analytics endpoints + Recharts UI
- [ ] Multi-currency reports (explicit rates only)
- [ ] Monthly subscription review generator
- [ ] CSV import (preview, mapping, dedup)
- [ ] Unused-subscription flags
- [ ] Full i18n (en/ru/tr) wired end-to-end

## Phase 6 — Professional Release
- [ ] Landing page + Founder Story
- [ ] Full demo mode with reset
- [ ] UI polish, accessibility pass
- [ ] Automated test suite green (backend + frontend)
- [ ] Deployment configuration
- [ ] Documentation pass
