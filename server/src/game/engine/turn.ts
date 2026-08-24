import type { Character, Dynasty } from "@dynasty/shared";
import { EPOCH_BY_ID, TRACK_SETS } from "@dynasty/shared";
import { rollMortality } from "./mortality.js";
import { tickTrackMechanic } from "./tracks.js";

export type TurnResult = {
  character: Character;
  dynasty: Dynasty;
  log: string[]; // deterministic log lines generated this turn
  died: boolean;
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function trackDefFor(c: Character) {
  const epoch = EPOCH_BY_ID[c.epochId];
  if (!c.trackId) return null;
  const set = TRACK_SETS[epoch.trackSet];
  return set[c.trackId as keyof typeof set] ?? null;
}

// Deterministic per-year advance, implementing the parts of Section 9's turn
// structure that don't require an AI call. Numbered comments map back to the
// handoff doc's numbered list; anything not implemented yet is marked TODO
// rather than silently skipped, so it's clear what a rebuild session still
// owes.
export function advanceYear(character: Character, dynasty: Dynasty): TurnResult {
  const c: Character = structuredClone(character);
  const log: string[] = [];

  // 1. Achievement/legacy-point checks, victory condition check. TODO: full
  // achievement/victory system (Sections 6 "victory goals", Codex screen).

  // 2. Fatal check up front (e.g. imprisonment execution risk) - none wired
  // yet; falls through to the age-appropriate mortality roll in step 12.

  // 3. Age+1, year+1, salary + property income, health regen, debt interest,
  // old-age decay.
  c.age += 1;
  c.year += 1;

  const track = trackDefFor(c);
  if (track && !c.retired) {
    const salary = Math.round(track.baseSalary * (1 + 0.6 * c.trackTier));
    c.stats.wealth = clamp(c.stats.wealth + salary, 0, 999);
    log.push(`Earned ${salary} ${EPOCH_BY_ID[c.epochId].currency} as a ${track.titles[c.trackTier] ?? "ruler"}.`);
  }
  for (const p of c.properties) {
    c.stats.wealth = clamp(c.stats.wealth + 5, 0, 999);
  }
  if (c.stats.health < 90 && c.age < 60) c.stats.health = clamp(c.stats.health + 1);
  if (c.debt) {
    c.debt.principal = Math.round(c.debt.principal * 1.08);
    if (c.debt.principal > 150) c.stats.popularity = clamp(c.stats.popularity - 1);
  }
  if (c.age > 70) {
    c.stats.skill = clamp(c.stats.skill - 1);
    c.stats.health = clamp(c.stats.health - 2);
  }

  // 4. Multi-year crisis tick. TODO: real crisis catalogue (plague/famine/
  // war/unrest with distinct yearlyDelta effects) - currently only decrements
  // an existing crisis's timer.
  if (dynasty.activeCrisis) {
    dynasty.activeCrisis.yearsRemaining -= 1;
    dynasty.nationPower = clamp(dynasty.nationPower + dynasty.activeCrisis.yearlyDelta, 0, 100);
    if (dynasty.activeCrisis.yearsRemaining <= 0) {
      log.push(`The ${dynasty.activeCrisis.label} has passed.`);
      dynasty.activeCrisis = null;
    }
  }

  // 5. Reputation decay above 50, domestic-bond decay toward neutral (fixes
  // the original's one-way rival-tension-escalation bug - see Section 8).
  if (c.stats.influence > 50) c.stats.influence -= 1;
  if (c.stats.popularity > 50) c.stats.popularity -= 1;
  if (c.domestic.rivalTension !== undefined) {
    c.domestic.rivalTension += c.domestic.rivalTension > 50 ? -1 : c.domestic.rivalTension < 50 ? 1 : 0;
  }
  if (c.domestic.mentorTrust !== undefined && c.domestic.mentorTrust > 50) c.domestic.mentorTrust -= 1;
  if (c.domestic.friendBond !== undefined && c.domestic.friendBond > 50) c.domestic.friendBond -= 1;

  // 6. Prison countdown, NPC aging, background-relatives tick.
  if (c.imprisoned) {
    c.imprisoned.yearsRemaining -= 1;
    if (c.imprisoned.yearsRemaining <= 0) {
      log.push("Released from imprisonment.");
      c.imprisoned = null;
    }
  }
  if (c.family.spouseAge !== undefined) c.family.spouseAge += 1;
  if (c.domestic.mentorAge !== undefined) c.domestic.mentorAge += 1;
  if (c.domestic.rivalAge !== undefined) c.domestic.rivalAge += 1;
  if (c.domestic.friendAge !== undefined) c.domestic.friendAge += 1;
  for (const child of c.family.children) child.age += 1;
  for (const s of c.siblings) s.age += 1;
  // TODO: background-relatives simulation (unplayed relatives aging/marrying/
  // dying off-screen).

  // 7. Notification-only events (world event, rival strike, gifts). TODO:
  // full pool - a minimal world-event toast is emitted in step 12 below.

  // 8-10. Priority scripted events, track-specific mechanic rolls, broader
  // life events (marriage prospects, family council, faction events, etc.).
  // Only Political/Military/Commercial have distinct mechanics wired so far
  // (see ./tracks.ts) - everything else in Sections 6 and 8 is still TODO.
  let trackDeathCause: string | null = null;
  const trackTick = tickTrackMechanic(c);
  log.push(...trackTick.log);
  if (trackTick.deathCause) trackDeathCause = trackTick.deathCause;

  // 11. Coming-of-age at 18: assign a track if the character doesn't have
  // one yet.
  if (c.age === 18 && !c.trackId) {
    const epoch = EPOCH_BY_ID[c.epochId];
    const set = TRACK_SETS[epoch.trackSet];
    const trackId = Object.keys(set)[Math.floor(Math.random() * Object.keys(set).length)];
    c.trackId = trackId;
    c.trackTier = 0;
    log.push(`Came of age and entered the ${set[trackId as keyof typeof set].label} track.`);
  }

  // 12. Mortality roll, milestone check (TODO), specialization prompt
  // (TODO), world event + nation-power drift. A track-specific death (e.g.
  // military campaign) takes priority over the generic age/health roll.
  const cause = trackDeathCause ?? rollMortality(c);
  let died = false;
  if (cause) {
    c.alive = false;
    c.deathCause = cause;
    died = true;
    log.push(`${c.name} has died, aged ${c.age}, of ${cause}.`);
  } else {
    // tier promotion on sustained skill/influence growth
    if (track && c.trackTier < 3) {
      const threshold = (c.trackTier + 1) * 25;
      if (c.stats.skill >= threshold || c.stats.influence >= threshold) {
        c.trackTier += 1;
        log.push(`Promoted to ${track.titles[c.trackTier] ?? "the throne"}.`);
      }
    }
    if (track && c.age >= track.retireAge && !c.retired && Math.random() < 0.15) {
      c.retired = true;
      log.push(`${c.name} retired from ${track.label.toLowerCase()} life.`);
    }
    dynasty.nationPower = clamp(dynasty.nationPower + (Math.random() < 0.5 ? -1 : 1), 0, 100);
    const epoch = EPOCH_BY_ID[c.epochId];
    if (epoch.worldEvents.length && Math.random() < 0.3) {
      const ev = epoch.worldEvents[Math.floor(Math.random() * epoch.worldEvents.length)];
      dynasty.eventTicker.push({ year: c.year, text: ev });
      if (dynasty.eventTicker.length > 150) dynasty.eventTicker.shift();
    }
  }

  c.log.push({ age: c.age, year: c.year, text: log.join(" ") || "A quiet year passed." });

  return { character: c, dynasty, log, died };
}
