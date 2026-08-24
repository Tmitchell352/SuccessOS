# Dynasty

A BitLife-style multi-generational life simulator. This is a standalone rebuild — see [`docs/DYNASTY_HANDOFF.md`](docs/DYNASTY_HANDOFF.md) for the full design spec this was built against.

**Important context on this rebuild:** the original `dynasty.jsx` prototype (a single ~4,900-line React artifact that ran inside Claude.ai's sandbox) was not available when this rebuild started — only the design document. So this repo is a real, from-scratch implementation of that design: a genuine backend, database, and auth, but only a subset of the original's content and mechanics. See "What's implemented" below for the honest boundary.

## Stack

- **`shared/`** — TypeScript types and static game data (epochs, nations, career tracks) used by both server and client. This is the single source of truth for the `Character`/`Dynasty`/`TreeRecord` shapes (handoff doc Section 2).
- **`server/`** — Express + TypeScript API. Holds the deterministic turn engine, the Anthropic API key (never sent to the client), and talks to Supabase with the caller's own access token so Postgres Row Level Security does the authorization, not application code.
- **`client/`** — React + Vite + TypeScript. Thin UI; all game logic runs server-side.
- **Supabase** — Postgres + Auth. One table, `dynasty_saves`, storing a single JSONB blob per save slot (see "Persistence" below for why).

## Setup

```bash
npm install
cp server/.env.example server/.env       # fill in ANTHROPIC_API_KEY if you have one
cp client/.env.example client/.env.local
npm run dev:server   # http://localhost:8787
npm run dev:client   # http://localhost:5173
```

The Supabase URL/anon key in the `.env.example` files already point at a real project (`Tmitchell352's Project`) with the `dynasty_saves` table and RLS policies applied — see [`docs/DYNASTY_HANDOFF.md`](docs/DYNASTY_HANDOFF.md) for schema details. That project also hosts an unrelated existing app (`firms`/`clients`/`matters`/etc. tables) — Dynasty only touches `dynasty_saves`.

Without `ANTHROPIC_API_KEY` set, the game still fully works — every turn falls back to the deterministic narrative (the original's "No AI Narration" mode), per Section 9 of the handoff doc.

## What's implemented

- Full `Character`/`Dynasty`/`TreeRecord` type system (handoff Section 2).
- All 20 epochs with correct id/year/label/currency, and nation counts matching Section 4's table (9 nations for each of the first 8 ancient epochs, 6 for the remaining 12 — 116 unique nations total, close to the spec's 111 target). This is an independently-researched roster of real, period-appropriate historical polities, not a port of the original's actual list (that content lived only in the unavailable source file) — validated by a script confirming every nation has a matching NPC and continent entry and every epoch hits its target count.
- All 10 career tracks' title ladders and salaries, in all 4 era-appropriate dictionaries (Section 5) — and now all 10 tracks' *distinct* mechanics from Section 5's table are wired into the engine (`server/src/game/engine/tracks.ts`): Political's elite/commoner standing split, Military's campaign injury/death risk, Religious's uncapped followers with schism risk, Criminal's heat meter with bribe/flee/imprison resolution, Academic's named treatises, Commercial's major-deal coin-flip, Medical's skill-weighted difficult cases, Maritime's voyage risk, Artisan's masterworks, and Sports's persistent rival with win/loss record and endorsement deals.
- The deterministic per-turn engine (`server/src/game/engine/turn.ts`), covering most of Section 9's numbered turn structure: aging, salary/property income, health regen, debt interest, old-age decay, reputation and domestic-bond decay (including the fix for the original's one-way rival-tension bug), NPC/children aging, coming-of-age track assignment, mortality rolls, tier promotion, and world-event/nation-power drift.
- One AI call site (`generateEvent`, Section 9's "only 4 things call the AI" rule) using the Anthropic TypeScript SDK server-side, with a deterministic fallback when no key is configured.
- **Geopolitical systems** (Section 6, `server/src/game/engine/geopolitics.ts`): world relations (initialized per nation at founding, merged between character and dynasty), military-track conquest with permanent recording and integration-crisis decay (including nations breaking free if neglected), throne rebellion against unpopular rulers, the coup-flavored "seize power" path for any non-political track at max tier, alliances with the automatic rival-souring side effect, espionage as a legacy-point-gated Dynasty Action, religious/cultural conversion with recurring suspicion, court faction support (and the neglect penalty below 15 standing), and succession crises when a ruler dies leaving a child heir. The automatic pieces (integration decay, throne rebellion, faction neglect, conversion suspicion) tick every turn; the rest are explicit player actions exposed under `/geopolitics/:slotIndex/*` since they're real choices, not scripted turn events. Branching historical milestones aren't implemented yet.
- Auth, save/load, turn-advance, choose-heir, and geopolitical-action routes, backed by Supabase Auth + Postgres with RLS.
- **The persistence bug class from Section 10 is designed out structurally**: `server/src/game/engine/persistence.ts` is the single `serializeDynasty`/`deserializeDynasty` choke point every route uses, and `dynasty_saves.dynasty` is one JSONB column — there is no second or third place a new field can be forgotten.
- A minimal React client covering the golden path: login → slots → create → play → death → choose heir. It does not yet have UI for the geopolitical action endpoints above (conquest, alliances, espionage, etc.) - those are only reachable via the API today.

## What's NOT implemented yet

Following the handoff doc's own priority order (Section 12), roughly in the order it makes sense to tackle:

1. **Family systems** (Section 8): AI-generated marriage suitors, active parenting choices, background-relatives simulation, will styles affecting inheritance splits.
2. **Economy depth** (Section 7): risky ventures (outside the Maritime/Commercial track events), gifting, inheritance friction, dowries — property and debt interest are the only general-economy pieces wired in so far.
3. **Branching historical milestones** (Section 6's last bullet) - the other geopolitical systems are implemented, this one isn't.
4. **Achievements, victory conditions, and the Codex/Almanac/Timeline/Chronicle/Biography screens** (Section 3's secondary-screen list) — the client only implements the golden path today.
5. **Client UI for the geopolitical action endpoints** — the engine and API routes exist; there's no "Dynasty Actions" screen to trigger them from yet.
6. The other 3 AI call sites (`resolveCustomAction`, `generateSuitors`, `writeChronicle`/`writeEulogy`/`writeBiography`).

## Known issue surfaced during setup

The Supabase project this repo uses (`Tmitchell352's Project`) has **Row Level Security disabled on its other 8 tables** (`firms`, `users`, `clients`, `matters`, `deadlines`, `documents`, `invoices`, `subscriptions`) — unrelated to Dynasty, but worth fixing if that app is in active use. `dynasty_saves` itself has RLS enabled with owner-only policies.
