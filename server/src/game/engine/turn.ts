import type { Character, Dynasty } from "@dynasty/shared";
import { EPOCH_BY_ID, nearestEpoch, PROPERTY_TIER_BY_ID, TRACK_SETS } from "@dynasty/shared";
import { rollMortality } from "./mortality.js";
import { tickTrackMechanic } from "./tracks.js";
import { tickGeopolitics } from "./geopolitics.js";
import { tickFamily } from "./family.js";
import { tickMilestones } from "./milestones.js";
import { checkVictory, tickAchievements } from "./achievements.js";
import { tickLifeEvents } from "./lifeEvents.js";

export type TurnResult = {
  character: Character;
  dynasty: Dynasty;
  log: string[]; // deterministic log lines generated this turn
  died: boolean;
  victoryAchieved: boolean;
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

const CRISES: { id: string; label: string; yearlyDelta: number; minYears: number; maxYears: number }[] = [
  { id: "plague", label: "Plague", yearlyDelta: -3, minYears: 2, maxYears: 4 },
  { id: "famine", label: "Famine", yearlyDelta: -2, minYears: 1, maxYears: 3 },
  { id: "war", label: "War", yearlyDelta: -4, minYears: 2, maxYears: 5 },
  { id: "unrest", label: "Civil Unrest", yearlyDelta: -2, minYears: 1, maxYears: 2 },
];

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

  // 1. Achievement/legacy-point checks, victory condition check (see
  // ./achievements.ts). Checks state as of the end of the previous turn -
  // a promotion or milestone from later in *this* turn shows up next turn,
  // which is an acceptable one-turn lag for a periodic check like this.
  const achievementTick = tickAchievements(c, dynasty);
  log.push(...achievementTick.log);
  const victoryCheck = checkVictory(dynasty, c.year);
  log.push(...victoryCheck.log);

  // 2. Fatal check up front (e.g. imprisonment execution risk) - none wired
  // yet; falls through to the age-appropriate mortality roll in step 12.

  // 3. Age+1, year+1, salary + property income, health regen, debt interest,
  // old-age decay.
  c.age += 1;
  c.year += 1;

  // Epoch drift (Section 1: "the dynasty ... potentially spanning
  // thousands of years and drifting across historical epochs as the
  // in-game year advances"). Previously nothing ever moved epochId once a
  // character was founded - nearestEpoch existed but was never called.
  const currentEpoch = nearestEpoch(c.year);
  if (currentEpoch.id !== c.epochId) {
    c.epochId = currentEpoch.id;
    if (!c._erasWitnessed.includes(currentEpoch.id)) c._erasWitnessed.push(currentEpoch.id);
    log.push(`The age of ${currentEpoch.label} has arrived.`);
  }

  // Milestone check (Section 6's last bullet, see ./milestones.ts). A
  // branching milestone pauses the turn here - everything below (family,
  // geopolitics, track mechanics, mortality) waits until it's resolved via
  // /turn/:slotIndex/resolve-milestone, so the world doesn't keep moving
  // underneath an unmade decision.
  const milestoneTick = tickMilestones(c, dynasty);
  log.push(...milestoneTick.log);
  if (milestoneTick.paused) {
    c.log.push({ age: c.age, year: c.year, text: log.join(" ") });
    return { character: c, dynasty, log, died: false, victoryAchieved: victoryCheck.achieved };
  }

  const track = trackDefFor(c);
  if (track && !c.retired) {
    const salary = Math.round(track.baseSalary * (1 + 0.6 * c.trackTier));
    c.stats.wealth = clamp(c.stats.wealth + salary, 0, 999);
    log.push(`Earned ${salary} ${EPOCH_BY_ID[c.epochId].currency} as a ${track.titles[c.trackTier] ?? "ruler"}.`);
  }
  // Recurring yearly income per property tier (Section 7) - previously a
  // flat +5 regardless of tier, since PROPERTY_TIERS didn't exist yet.
  for (const p of c.properties) {
    const income = PROPERTY_TIER_BY_ID[p.typeId]?.yearlyIncome ?? 5;
    c.stats.wealth = clamp(c.stats.wealth + income, 0, 999);
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
  if (c.stats.wealth === 0) c._wasDestitute = true;

  // 4. Multi-year crisis tick: a small catalogue (plague/famine/war/unrest),
  // each with its own yearlyDelta and duration - previously activeCrisis
  // was only ever decremented/nulled, never actually started, so it could
  // never fire (and _survivedCrisis could never become true).
  if (dynasty.activeCrisis) {
    dynasty.activeCrisis.yearsRemaining -= 1;
    dynasty.nationPower = clamp(dynasty.nationPower + dynasty.activeCrisis.yearlyDelta, 0, 100);
    if (dynasty.activeCrisis.yearsRemaining <= 0) {
      log.push(`The ${dynasty.activeCrisis.label} has passed.`);
      dynasty.activeCrisis = null;
      c._survivedCrisis = true;
    }
  } else if (Math.random() < 0.04) {
    const chosen = CRISES[Math.floor(Math.random() * CRISES.length)];
    const yearsRemaining = chosen.minYears + Math.floor(Math.random() * (chosen.maxYears - chosen.minYears + 1));
    dynasty.activeCrisis = { id: chosen.id, label: chosen.label, yearsRemaining, yearlyDelta: chosen.yearlyDelta };
    log.push(`A ${chosen.label.toLowerCase()} has begun.`);
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
  if (c.protegeAge !== undefined) c.protegeAge += 1;
  for (const child of c.family.children) child.age += 1;
  for (const s of c.siblings) s.age += 1;

  // Family systems (Section 8, see ./family.ts): children being born,
  // domestic-NPC and spouse mortality risk, and a cheap background
  // simulation for unplayed siblings.
  const familyTick = tickFamily(c, dynasty);
  log.push(...familyTick.log);

  // 7. Notification-only events (world event, rival strike, gifts). TODO:
  // full pool - a minimal world-event toast is emitted in step 12 below.

  // 8. Priority scripted events: throne rebellion, court faction neglect,
  // integration crises on conquered nations, conversion suspicion (Section
  // 6 - see ./geopolitics.ts). Runs before the track-specific roll, matching
  // the handoff doc's priority order.
  let scriptedDeathCause: string | null = null;
  const geoTick = tickGeopolitics(c, dynasty);
  log.push(...geoTick.log);
  if (geoTick.deathCause) scriptedDeathCause = geoTick.deathCause;

  // 9-10. Track-specific mechanic rolls, broader life events (marriage
  // prospects, family council, etc.). All 10 tracks have distinct mechanics
  // wired (see ./tracks.ts); the broader life-event pool in Section 8 is
  // still TODO. Skipped if a rebellion already killed the character this
  // turn.
  if (!scriptedDeathCause) {
    const trackTick = tickTrackMechanic(c, dynasty);
    log.push(...trackTick.log);
    if (trackTick.deathCause) scriptedDeathCause = trackTick.deathCause;
  }

  // 10 (cont.). Broader life events (see ./lifeEvents.ts): a small chance of
  // an ambient flavor beat - family reunion, sibling interaction, protege
  // growth, a marriage-prospects or conversion-opportunity nudge, a faction
  // overture - so a quiet non-milestone, non-track-event year doesn't feel
  // empty. Skipped on a turn that's already ending in a scripted death.
  if (!scriptedDeathCause) {
    const lifeEventTick = tickLifeEvents(c);
    log.push(...lifeEventTick.log);
  }

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

  // 12. Mortality roll, specialization prompt (TODO), world event +
  // nation-power drift. (Milestone check already ran above, ahead of
  // family/geopolitics/track ticks, since a branching one needs to pause
  // everything else.) A scripted death (palace coup, military campaign)
  // takes priority over the generic age/health roll.
  const cause = scriptedDeathCause ?? rollMortality(c);
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

  return { character: c, dynasty, log, died, victoryAchieved: victoryCheck.achieved };
}
