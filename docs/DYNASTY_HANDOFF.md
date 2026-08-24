# DYNASTY — Full Project Handoff

**What this is:** a BitLife-style multi-generational life simulator, originally built as a single React artifact (`dynasty.jsx`, ~360KB, ~4,900 lines) running inside Claude.ai's artifact sandbox. This document is the complete design/logic spec used to bootstrap the standalone rebuild in this repository (see `/server`, `/client`, `/shared`, and the root `README.md` for what has actually been built so far and what remains).

**Read this first if the goal is a standalone/App Store app:** the original build depended entirely on Claude.ai's sandboxed artifact environment and could not be extracted and run as-is anywhere else:
- All AI calls went through a special no-API-key mechanism that only works inside a live Claude.ai artifact session. Outside that sandbox, every AI call in this game needs a real Anthropic API key and real billing on whoever hosts it.
- All persistence went through `window.storage`, a Claude-artifact-only API — not a real database, not IndexedDB, not anything that exists in a normal browser or native app.
- A real rebuild needs: its own backend, its own database, its own Anthropic API key with billing, and — if going to an app store — proper native or PWA packaging, an Apple Developer account, a privacy policy, and compliance with store review guidelines.

This document describes the **game design and logic** in enough detail to rebuild it correctly in a new stack, not just the original implementation's file structure.

---

## 1. Core Concept

Player starts a character at age 5 in a chosen nation, in a chosen historical epoch. They make choices (scripted or free-text) that shape stats, career, relationships, and legacy. When the character dies, the player chooses an heir (usually a child) and continues playing as them — the "dynasty" persists across generations, potentially spanning thousands of years and drifting across historical epochs as the in-game year advances.

**Original scope:** 20 historical epochs (-3000 BCE to 2000 CE), 111 unique playable nations, 10 career tracks each with genuinely distinct mechanics, and dozens of interlocking systems (economy, geopolitics, family, health, achievements).

---

## 2. Data Model

### Character object (the currently-played person)

```js
{
  id, name, epochId, nation, classId, trackId, age, year,
  stats: { influence, skill, wealth, health, popularity }, // 0-100 except wealth (0-999)
  relations: { [nationName]: 0-100 },        // this character's personal view of world relations
  family: {
    status: "single" | "married",
    spouseName, spouseAge, spouseBond,
    children: [{ name, age, traits: [], giftedWealth, parenting: [] }],
  },
  domestic: {
    mentorName, mentorTrust, mentorAge,
    rivalName, rivalTension, rivalAge,
    friendName, friendBond, friendAge,
  },
  siblings: [{ name, age }],
  traits: [],                                 // inherited/acquired flavor traits with stat nudges
  homeRegion, specializations: {},             // { [trackId]: specializationId }
  conditions: [],                              // injuries/afflictions, flavor + narrative only
  imprisoned: null | { reason, yearsRemaining },
  willStyle: "default" | "equal" | "eldestFavored" | "youngestFavored",
  properties: [{ id, typeId, name, boughtYear }],
  debt: null | { principal },
  advisorName, scenarioNote, possessions: [], achievements: [],
  wartime: false, retired: false,
  log: [{ age, year, text }],
  protegeName, protegeAge, protegeBond,        // being someone's mentor (flip side)
  heat: 0,                                     // criminal track: law-enforcement attention, 0-100
  followers: 0,                                // religious track: uncapped congregation size
  eliteStanding: 50,                           // political track: separate from popularity (commoner standing)
  sportsRivalName, sportsRivalWins, sportsRivalLosses,
  convertedFaith: null,                        // religious/cultural conversion target nation
  factionStanding: { [factionName]: 50 },      // court faction standing, 3 fixed factions
  _erasWitnessed: [],                          // epochs lived through, for achievements
  _traditionAppliedTracks: [],                 // family tradition bonus application tracking
  _hadDebt, _sentVenture, _wasDestitute, _survivedCrisis,  // hidden achievement flags
}
```

### Dynasty object (persists across generations)

```js
{
  people: { [id]: treeRecord },               // full family tree, dead and alive
  firedMilestones: [],                         // historical milestone years already triggered
  currentId,                                   // id of currently-played character
  worldRelations: { [nationName]: 0-100 },      // dynasty-level world relations (merges into character.relations)
  legacyPoints: 0,                              // spendable currency for Dynasty Actions
  legacyRival: null | { name, tension },
  familySeat: false,                            // reduces inheritance friction, one-time purchase
  reputationBonus: 0,
  difficulty: "gentle" | "standard" | "ruthless",
  tone: "balanced" | "gritty" | "witty" | "romantic",
  almanac: [],                                  // named NPCs encountered, for reference screen
  rivalHouse: { name, score, relation },
  motto, crestEmoji, crestColor,
  biographies: { [personId]: text },            // AI-generated, cached per person
  eventTicker: [{ year, text }],                // capped at 150 entries
  victoryGoal: "none" | "gen10" | "legacy300" | "legacy750",
  victoryAchieved: false,
  greatWorks: [{ name, type, commissionedBy, year }],
  nationPower: 50,                              // 0-100, home nation's geopolitical standing
  activeCrisis: null | { id, label, yearsRemaining, yearlyDelta },
  dynastyAchievements: [],                      // dynasty-wide achievement ids unlocked
  everUnlockedAchievements: [],                 // includes hidden achievements, for Codex display
  properties: [],                               // dynasty-level (rarely used; mostly on character)
  tradition: "none" | "military" | "scholarly" | "mercantile" | "political" | "devout",
  conqueredNations: [{ nation, mode: "absorbed"|"destroyed", year, integration: 0-100 }],
  noAiMode: false,                              // player opt-out of AI-generated story turns
  chronicleText: null,
}
```

### Tree record (each person in `dynasty.people`, alive or dead)

```js
{
  id, name, parentId, generation, birthYear, deathYear,
  nation, classId, epochId, peakTitle,
  traits, giftedWealth, parenting,             // for living children not yet activated
  // set at death:
  cause, age, peakInfluence, peakWealth, peakSkill, peakPopularity,
  achievementCount, heldThrone, possessions, willStyle, properties,
}
```

---

## 3. Screens (21 total)

`loading` → `login` (or `intro` for first-time users) → `slots` → `create` → `birth` → `play` → `gameover` → `chooseHeir` (or `resumePrompt`)

Secondary screens, all reachable through a single **☰ Menu** hub (added specifically to prevent nav-button sprawl — the play screen once had 8 stacked buttons):

`menu`, `dynastyActions`, `estate`, `almanac`, `records`, `ticker` (history), `tree`, `codex` (achievements), `settings`, `timeline`, `chronicle`, `biography`.

**Design note:** early in development, secondary screens accumulated their own independent stacks of navigation buttons (chooseHeir, gameover, play screen each grew 5-8 buttons over time). This was consolidated into one Menu hub with a 2-column icon grid. If rebuilding, start with this hub pattern rather than organically growing per-screen nav.

---

## 4. The 20 Epochs

| Epoch ID | Year | Label | Nations |
|---|---|---|---|
| earlyBronze | -3000 | Early Bronze Age | 9 |
| middleBronze | -2000 | Middle Bronze Age | 9 |
| lateBronze | -1400 | Late Bronze Age | 9 |
| ironAge | -900 | Iron Age Empires | 9 |
| classical | -500 | Classical Antiquity | 9 |
| hellenistic | -300 | Hellenistic Age | 9 |
| hanChina | -200 | Classical East Asia | 9 |
| rome | -250 | Ancient Rome | 9 (bespoke tracks/classes, not shared dictionaries) |
| lateAntiquity | 400 | Late Antiquity | 6 |
| earlyMedieval | 700 | Early Medieval | 6 |
| highMedieval | 1200 | High Medieval | 6 |
| preColumbianAmericas | 1300 | Pre-Columbian Americas | 6 |
| subSaharanAfrica | 1350 | West & Southern African Kingdoms | 6 |
| renaissance | 1500 | Renaissance & Exploration | 6 |
| colonialAmericas | 1630 | Colonial Americas | 6 |
| absolutism | 1650 | Age of Absolutism | 6 |
| enlightenment | 1750 | Enlightenment & Empire | 6 |
| europe1897 | 1897 | Europe, Age of Empires | 6 |
| coldWar | 1950 | Cold War Era | 6 |
| contemporary | 2000 | Contemporary World | 6 |

**111 unique nations total**, each mapped to a continent (Africa, The Americas, Asia, Europe) via a standalone lookup table (`NATION_CONTINENT`), independent of the epoch data — this enables continent-first browsing without needing per-epoch continent tagging. First 7 epochs were substantially expanded (6→9 nations each) specifically to fix a severe Asia/Europe-heavy imbalance versus Africa/Americas; that imbalance still exists in the remaining 13 epochs if further work continues.

Each epoch also carries: `currency` (flavor label for wealth, e.g. "shekels", "denarii", "ducats"), `classes` (starting social classes with weighted rarity), `tracks` (career ladder definitions — one of 4 shared dictionaries: `GENERIC_TRACKS`, `EARLY_MODERN_TRACKS`, `MODERN_TRACKS`, or Rome's own bespoke inline set), `worldEvents` (flavor pool for background world events), and `npcs` (one named NPC per nation, with title, used for diplomatic/rival/mentor flavor).

`nearestEpoch(year)` picks the closest epoch by `matchYear` when a player types a starting year directly.

---

## 5. Career Tracks (10, each with genuinely distinct mechanics)

All tracks share: a 4-tier title ladder (each epoch's track dictionary defines era-appropriate titles), salary scaling by tier, and 3-4 specializations chosen once per track (one-time stat perk).

| Track | Unique mechanic |
|---|---|
| **Political** | Natural route to becoming the nation's actual ruler — the top tier's title is `null` in the ladder data, which falls back to the nation's real "top" title (Emperor/President/etc). Also: elite vs. commoner standing split (`eliteStanding` vs `popularity`), court factions. |
| **Military** | Real campaign events with injury/death risk. Also the primary route to `canAttemptSeizePower` — any non-political track at max tier can attempt a coup for the throne, with track-flavored framing (coup, revolution, theocratic uprising, etc. depending on track). |
| **Religious** | Uncapped `followers` count, grown via preaching/paid conversion/tending the flock. Cross 150 followers → schism risk from an internal rival. |
| **Criminal** | `heat` meter (0-100) that drifts up naturally while active. Cross 75 → law closes in, forcing bribe/flee/fight. Heat decays if inactive. |
| **Academic** | Publish treatises that become named possessions, referenced in biographies. |
| **Commercial** | High-stakes "major deal" events — aggressive negotiation is a real coin-flip. |
| **Medical** | Difficult-case events with skill-weighted survival odds; special epidemic-response event when a plague crisis is active in the world. |
| **Maritime** | Voyage events — real risk of losing the investment, real chance of a big return. |
| **Artisan** | Masterwork creation — chance of an "extraordinary" named work vs. a merely respectable one. |
| **Sports** | The most recently added track. A persistent named rival with a real win/loss record. Major competitions with injury risk. Endorsement deals (fame→wealth). Early retirement (32, not 55) with a "become a coach" framing. |

**Cross-track systems layered on top:**
- **Family traditions** (chosen once at founding) — permanent bonus to all future descendants who settle into a matching track.
- **Specializations** — one-time choice per track, prompted the first time a character (age 18+) has no specialization yet for their current track.
- **Change Career** — mid-life track switching, available anytime after 18.

---

## 6. Geopolitical Systems

- **World relations** — per-nation 0-100 score, tracked at both dynasty and character level, merged on save.
- **Conquest** — military-track characters at tier 3+ can attempt to absorb or destroy a rival nation. Both are genuinely risky (real success odds tied to skill/influence), and **permanently recorded** on the dynasty (`conqueredNations`), fed into every future AI prompt via `dynastyContext()` so the consequence narratively persists across the rest of the dynasty's history — the "butterfly effect" is implemented as permanent AI context, not a rewritten world-state map.
- **Integration crises** — every conquered nation has an ongoing `integration` level (0-100) that drifts down if neglected. Real choices to pacify (costly), suppress (popularity cost), or ignore (risk of the territory breaking free again, with a real nation-power penalty).
- **Throne rebellion** — the mirror of seizing power: if you're the actual sitting ruler and popularity drops below 30, a named rival can move against *you*, with a real chance of losing everything (or dying).
- **Alliance web** — forging an alliance with one nation automatically sours relations with a random other rival — a real trade-off, not an independent bilateral choice.
- **Succession crises** — a ruler dying without an adult child ready to inherit triggers a real nation-power penalty and a permanent ticker entry.
- **Espionage** — a Dynasty Action: send spies into a rival nation for a real chance at advantage, with a real diplomatic/reputational cost if caught.
- **Religious/cultural conversion** — convert to a foreign nation's ways for better relations there, at a real popularity cost at home; can trigger recurring "suspicion at home" events if popularity stays low.
- **Court factions** — 3 fixed internal factions (The Old Guard, The Reformers, The War Party) each tracked 0-100 on the character. Real events force choosing a side (strengthens one, weakens the others) or staying neutral. Neglect a faction below 15 and it moves against you directly.
- **Milestone branching** — most of the ~26 fixed historical milestones apply a flat delta and require only an acknowledgment click, but 5 of the most significant ones (Caesar's assassination, the French Revolution, 1848, the 2008 financial crisis) present real branching choices that get recorded specifically for that dynasty.

---

## 7. Economy

- **Property** — 6 tiers (smallHouse → grandEstate), one-time purchase cost + one-time bonus + recurring yearly income. Inherited by heirs.
- **Debt/loans** — single debt slot, compounds yearly at a fixed interest rate, costs popularity above a threshold.
- **Risky ventures** — 5-tier random outcome table, total loss to 4.5x return.
- **Gifting** — give wealth to living relatives (spouse, children — tracked as `giftedWealth` on the child, applied when they eventually become playable).
- **Inheritance friction** — a real cut taken at death before wealth transfers to the heir (22% with no planning, down to 8% with both a written will and a family seat) — makes succession planning have a mechanical payoff, not just flavor.
- **Dowries** — marriage prospects (AI-generated) explicitly frame wealth changes as real dowries/bride-prices per era and culture; the arranged-alliance-marriage option includes an explicit dowry payment.

---

## 8. Family & Relationships

- **Marriage** — either AI-generated named suitors (3 distinct prospects with real trade-offs) or a deterministic fallback (No AI mode). Includes an arranged-alliance option tied to world relations.
- **Children** — born via events, age alongside the player, can be given **active parenting choices** (strict/permissive/educate/labor) while still minors — these leave a real stat mark on the child once they eventually become playable, distinct from passively-inherited traits.
- **Domestic NPCs** — mentor, rival, friend, protege — each with their own trust/tension/bond stat, age, and mortality risk, ticked yearly. Rival tension and mentor/friend bond now **naturally decay toward neutral** if not actively fed (this was a real bug: rival tension previously only escalated, since each "rival strike" event added tension, creating a permanent-escalation loop with no way to de-fuse it).
- **Background relatives** — unplayed family members age, marry, have children, and die off-screen via a cheap deterministic simulation each year, so the family tree keeps growing even for people never directly played.
- **Wills** — 4 styles (default equal split, explicitly equal, eldest-favored, youngest-favored) affecting inheritance ratios and, narratively, sibling relations.

---

## 9. Turn Structure (the core game loop)

Each turn (`afterOutcome`), in priority order:

1. Achievement/legacy-point checks, victory condition check.
2. Fatal check → death handling if needed.
3. Age+1, year+1, salary + property income, health regen, debt interest, **old-age decay** (skill/health erosion past 70).
4. Multi-year crisis tick (plague/famine/war/unrest) or new-crisis roll.
5. Reputation decay (influence/popularity above 50 drift down), domestic-bond decay.
6. Prison countdown, NPC aging/mortality tick, background-relatives tick.
7. **Notification-only events** (world event, rival strike, mentor/friend/spouse gift) — these apply their effect via toast and **fall through** to the real event rather than consuming the whole turn (this was a real UX bug: they used to require a full click-to-advance, effectively replacing that year's actual story).
8. Priority scripted events, in order: throne rebellion → law-closing-in (criminal) → schism (religious) → epidemic response (medical) → sports rival intro → integration crisis (conquest) → conversion suspicion → faction backlash.
9. Track-specific mechanic roll (whichever track-specific event applies).
10. Broader life events: conversion opportunity, court faction event, family reunion, family council, parenting choice, sibling interaction, marriage prospects, protege offer/growth.
11. Coming-of-age at 18 (track assignment + advisor).
12. Conflict start/end, mortality roll, milestone check (fixed-year historical events, some branching), specialization prompt, health warning, legendary event roll, world event + nation-power drift.
13. Fallback: `fetchEventFor(c)` → the main AI-generated narrative turn (or the deterministic `noAiYearEvent` fallback if No AI mode is on).

**Only 4 things call the AI:** `generateEvent` (main turn), `resolveCustomAction` (free-text input), `generateSuitors` (marriage prospects), and the on-demand narrative generators (`writeChronicle`, `writeFinalRetrospective`, `writeEulogy`, `writeBiography`). Everything else in the list above is fully deterministic — this was a deliberate design choice, both for game feel (a rich simulation shouldn't need AI for every mechanical beat) and for cost control (a "No AI Narration" mode exists specifically to let players run the entire simulation with near-zero AI usage).

---

## 10. Persistence — known failure pattern, read this carefully

**This is the single most important thing to get right in a rebuild.** Across the original project's development, the exact same class of bug recurred twice: a new dynasty-level field would get added (to the live game logic, to `applyDelta`, to event handlers) but **not** added to all three places a save round-trips through:

1. The main per-turn save (`persist()`)
2. Loading a save back in (`openSlot()`)
3. Importing an exported save file (`importSaveFile()`)

Fields would work perfectly in a live session (since in-memory React state always has everything via object spread) and then **silently vanish** on reload — invisible until someone actually closed and reopened the app. This happened once with ~14 fields at once (difficulty, tone, almanac, rival house, motto, crest, biographies, event ticker, victory state, great works, nation power, active crisis, dynasty achievements, tradition), and recurred later with `conqueredNations` and `noAiMode` individually.

**This rebuild designs the bug out structurally**: `server/src/game/engine/persistence.ts` exposes a single `serializeDynasty(dynasty)` / `deserializeDynasty(json)` pair, and the entire codebase routes through it — the Supabase `dynasty_saves` table stores one JSONB blob per save slot rather than individual relational columns, so a new field only needs to be added to the `Dynasty` TypeScript type once, not remembered in three separate call sites.

**Secondary bug class found:** a stale-closure race where a function (`noteProgress`) could be called from a special branch that had already computed a newer version of the dynasty object than what was in React state — but a *second*, separate save call later in the same branch would use the older, stale `dynasty` reference and silently overwrite the newer one. Fixed via an explicit `baseDyn` parameter threaded through the ~10 call sites that needed it. Worth designing around from the start in a rebuild (e.g., a single source of truth for "the dynasty object as of this turn," never re-read from a captured closure mid-turn).

---

## 11. Style System

A single shared style object (`S`) plus a small theme constant (`A`: ink/paper/accent/border colors) that every screen imports from — this is what allowed a full visual redesign (flat black-and-white → warm parchment/bronze palette with real shadows) to apply everywhere in one edit rather than 21 separate ones. Font scaling (`fontScale` state, applied via CSS `zoom` on a shared `wrapStyle`) works the same way. **Recommend preserving this pattern in a rebuild** — a shared design-token/theme file that every component reads from, not per-component inline styles.

---

## 12. Suggested Priorities If Rebuilding in Claude Code

1. **Decide the backend shape first.** Minimum viable: a small Node/Express or Python/FastAPI server holding an Anthropic API key server-side (never expose it client-side), a real database (Postgres is a safe default; SQLite fine for a single-user/local-first version) replacing `window.storage`, and real auth (even a simple email+password or OAuth) replacing the original homegrown SHA-256 username/password system.
2. **Port the data model as-is** — Sections 2 and 4-8 above are implementation-agnostic; they translate directly into database tables/documents regardless of stack.
3. **Fix the persistence pattern structurally** (Section 10) rather than porting the reactive patch-it-when-it-breaks approach.
4. **Keep the deterministic-events-first design** (Section 9) — it's both good game design and the reason a "No AI Narration" mode was even possible to build cleanly. Don't let AI calls creep back into what are currently mechanical, choice-driven events.
5. **The 20-epoch/111-nation dataset (Sections 4-5) is the most content-heavy, least logic-heavy part of the codebase** — straightforward to port wholesale as static data (JSON), lowest-risk starting point for validating a new stack end-to-end before tackling the turn-resolution logic.
6. Ads and App Store distribution are legitimate considerations **only** once this is a genuinely independent app with its own backend — not applicable to anything running inside Claude.ai, per Anthropic's ad-free commitment for Claude products.

---

## Status of this rebuild

The original `dynasty.jsx` source file was not available when this rebuild was started — only this design document. See the root `README.md` for exactly what has been implemented against this spec, what's stubbed, and what's still missing (in particular: the full 111-nation dataset, most track-specific mechanics beyond Political/Military/Commercial, and most of the geopolitical/family systems in Sections 6 and 8 are not yet built).
