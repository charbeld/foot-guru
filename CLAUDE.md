# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js Version

This project uses **Next.js 16.2.7** with **React 19**. These versions have breaking changes from earlier releases. Before modifying any routing, rendering, or data-fetching code, read the relevant guide in `node_modules/next/dist/docs/`. Do not assume any Next.js conventions from training data — verify first.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run scrape:elo   # Scrape ELO ratings into DB (scripts/scrape-elo.ts)
npm run seed:matches # Seed match fixtures into DB (scripts/seed-matches.ts)
```

No test runner is configured.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — used by cron routes via `createAdminClient()`
- `FOOTBALL_DATA_API_KEY` — football-data.org v4 API key
- `CRON_SECRET` — Bearer token that cron endpoints validate

## Architecture

### Rendering model
Pages under `src/app/(main)/` are **server components by default** — they fetch from Supabase directly and render HTML. When a page needs client interactivity (tabs, modals, click handlers), the pattern is:

1. Keep `page.tsx` as a server component — it fetches all data.
2. Create a co-located `*Client.tsx` with `'use client'` at the top — it receives data as props and owns all state.

Examples: `stats/StatsClient.tsx`, `leaderboard/LeaderboardClient.tsx`, `(main)/matches/MatchesClient.tsx`.

### Supabase clients
- `src/lib/supabase/server.ts` — exports `createClient()` (anon key, for user-scoped queries) and `createAdminClient()` (service role key, for cron/admin routes only). Both are async and must be awaited.
- `src/lib/supabase/client.ts` — browser client for `'use client'` components.

### Auth & routing
- `src/proxy.ts` exports the middleware function that protects all routes — unauthenticated users are redirected to `/login`, authenticated users hitting `/login` or `/signup` are redirected to `/dashboard`.
- **Never create `src/middleware.ts`**. Next.js 16 errors if both `middleware.ts` and `proxy.ts` exist: `"Both middleware file and proxy file are detected. Please use proxy.ts only."` Delete any stale `middleware.ts` immediately.
- The route group `src/app/(auth)/` contains login and signup pages.
- The route group `src/app/(main)/` contains all protected pages; its `layout.tsx` verifies auth via Supabase and renders the `<Navbar>`.
- OAuth callback lands at `src/app/auth/callback/route.ts`, exchanges the code for a session, then redirects to `/dashboard`.

### Data flow for predictions
1. User submits a prediction → `POST /api/predictions` → validated against kickoff time → upserted into `predictions` table.
2. Cron job `GET /api/cron/sync-results` (runs every 5 min, secured by `CRON_SECRET`) polls football-data.org for finished matches and calls `calculateScore()` from `src/lib/scoring.ts` to write `points_earned`, `outcome_correct`, `exact_score_correct`, `elo_multiplier` back to each prediction row.
3. A second cron `GET /api/cron/sync-fixtures` (runs daily) pulls the full WC schedule and upserts matches as teams qualify.

### Scoring system (`src/lib/scoring.ts`)
Points formula: `(5 + 8 if exact score) × eloMultiplier × stageMultiplier`

- **ELO upset multiplier** applies only when the predicted team is the underdog (lower ELO). Gap ≤50 → ×1.0, 51–150 → ×1.5, 151–300 → ×2.0, 300+ → ×3.0.
- **Stage multipliers**: Group ×1.0, R32 ×1.25, R16 ×1.5, QF ×2.0, SF ×2.5, Final ×3.0.
- Source of truth for prediction eligibility: `kickoff_at`. No separate locking mechanism — the API rejects submissions once kickoff has passed, the UI locks the form client-side.

### Bracket quadrant mapping (`src/app/(main)/bracket/page.tsx`)
The `MATCH_QUADRANT` record maps each match's `external_id` (football-data.org match ID) to a quadrant index (0–3: Blue/Purple/Orange/Green). Quadrant determines color-coding and column placement in the top-down bracket view. Matches without a quadrant (SF, 3rd, Final) use the gold/yellow style.

### External data source
All live tournament data comes from **football-data.org v4** (`/v4/competitions/WC/`). The API key goes in the `X-Auth-Token` header. Pages that call this API directly (Groups, Stats) set `next: { revalidate: 300 }` for ISR caching.

### Timestamps
All times are stored in UTC. Display uses the **Asia/Beirut** timezone (`formatKickoff()` in `src/lib/utils.ts`).

## Deployment

### Auto-deploy hook
`.claude/settings.json` registers a `Stop` hook that runs `scripts/auto-deploy.ps1` after every Claude turn. It stages, commits, and pushes any uncommitted changes automatically. Vercel then deploys from the GitHub push.

### Vercel cron restriction (Hobby plan)
`vercel.json` must **not** contain cron schedules that run more than once per day — the Hobby plan rejects them and **silently blocks all deployments** (builds will fail at the cron validation step, not the compile step). The `sync-results` every-5-min job is handled by **pg_cron inside Supabase**, not Vercel. Only `sync-fixtures` (daily at `0 2 * * *`) belongs in `vercel.json`.
