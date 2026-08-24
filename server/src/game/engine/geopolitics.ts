import type { Character, CourtFaction, Dynasty } from "@dynasty/shared";
import { COURT_FACTIONS, EPOCH_BY_ID } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

// Geopolitical systems, per docs/DYNASTY_HANDOFF.md Section 6. Two kinds of
// function here:
//  - tickGeopolitics: automatic, called once per year from ./turn.ts
//    (integration decay, throne rebellion, faction neglect, conversion
//    suspicion - none of these need a player decision to occur).
//  - the rest: explicit player-initiated actions (conquest, seizing power,
//    alliances, espionage, integration management, conversion, court
//    faction support), exposed via server/src/routes/geopolitics.ts. These
//    are genuine choices in the original design, so unlike the automatic
//    turn structure they're modeled as their own API calls rather than
//    folded into advanceYear.
//
// STATUS: covers world relations, conquest + integration crises, throne
// rebellion, alliances (with the automatic rival-souring side effect),
// espionage, conversion + suspicion, and court factions. Succession crises
// are handled in routes/turn.ts's choose-heir handler (needs the dying
// character's context, not just a per-turn tick). Branching historical
// milestones (Section 6's last bullet) are not implemented yet.

export function initRelations(character: Character, dynasty: Dynasty): void {
  const epoch = EPOCH_BY_ID[character.epochId];
  for (const nation of epoch.nations) {
    if (nation === character.nation) continue;
    const existing = dynasty.worldRelations[nation] ?? clamp(40 + Math.round(Math.random() * 20));
    dynasty.worldRelations[nation] = existing;
    character.relations[nation] = existing;
  }
}

export type GeoTickResult = { log: string[]; deathCause?: string };

export function tickGeopolitics(c: Character, dynasty: Dynasty): GeoTickResult {
  const log: string[] = [];

  // Integration crises: every conquered nation drifts toward unrest if
  // neglected, with a real chance of breaking free once integration bottoms
  // out (Section 6: "risk of the territory breaking free again, with a
  // real nation-power penalty").
  const stillHeld = [];
  for (const cn of dynasty.conqueredNations) {
    cn.integration = clamp(cn.integration - (2 + Math.round(Math.random() * 3)));
    if (cn.integration <= 0 && Math.random() < 0.3) {
      dynasty.nationPower = clamp(dynasty.nationPower - 10);
      dynasty.eventTicker.push({ year: c.year, text: `${cn.nation} broke free from the dynasty's control after ${c.year - cn.year} years.` });
      log.push(`${cn.nation} has broken free from the dynasty's control.`);
    } else {
      stillHeld.push(cn);
    }
  }
  dynasty.conqueredNations = stillHeld;

  // Throne rebellion: the mirror of seizing power (Section 6). A sitting
  // ruler (political track, top tier) with low popularity risks being
  // deposed or worse.
  const isRuler = c.trackId === "political" && c.trackTier === 3;
  if (isRuler && c.stats.popularity < 30 && Math.random() < 0.12) {
    if (Math.random() < 0.4) {
      return { log: [`${c.name} was assassinated in a palace coup.`], deathCause: "assassinated in a palace coup" };
    }
    c.trackTier = 0;
    c.stats.influence = clamp(c.stats.influence - 30);
    c.stats.popularity = clamp(c.stats.popularity + 10);
    log.push("A palace rebellion deposed them from the throne.");
  }

  // Court factions: neglecting one below 15 means it moves against you
  // directly (Section 6).
  for (const faction of COURT_FACTIONS) {
    if (c.factionStanding[faction] < 15 && Math.random() < 0.15) {
      c.stats.influence = clamp(c.stats.influence - 8);
      c.stats.popularity = clamp(c.stats.popularity - 4);
      c.factionStanding[faction] = clamp(c.factionStanding[faction] + 10);
      log.push(`${faction} moved against them for their neglect.`);
    }
  }

  // Conversion suspicion: staying converted while unpopular at home risks
  // recurring suspicion events (Section 6).
  if (c.convertedFaith && c.stats.popularity < 40 && Math.random() < 0.15) {
    c.stats.popularity = clamp(c.stats.popularity - 5);
    log.push(`Suspicion grows at home over their devotion to ${c.convertedFaith}'s ways.`);
  }

  return { log };
}

export type ActionResult = { log: string[]; success: boolean };

const SEIZE_FLAVOR: Record<string, string> = {
  military: "coup", religious: "theocratic uprising", criminal: "shadow takeover",
  commercial: "bloodless boardroom coup", academic: "reformist uprising", medical: "public uprising",
  maritime: "naval mutiny", artisan: "guild uprising", sports: "populist uprising",
};

// Any non-political track at max tier can attempt a coup for the throne
// (Section 5's Military entry / Section 6), track-flavored per SEIZE_FLAVOR.
export function seizePower(c: Character): ActionResult {
  if (!c.trackId || c.trackId === "political" || c.trackTier < 3) {
    return { log: ["Only someone at the peak of a non-political career can attempt to seize power."], success: false };
  }
  const flavor = SEIZE_FLAVOR[c.trackId] ?? "coup";
  const odds = clamp((c.stats.influence + c.stats.popularity) / 2 - 20, 10, 85) / 100;
  if (Math.random() < odds) {
    c.trackId = "political";
    c.trackTier = 3;
    c.stats.influence = clamp(c.stats.influence + 20);
    c.eliteStanding = clamp(c.eliteStanding + 10);
    return { log: [`Seized the throne in a ${flavor}.`], success: true };
  }
  if (Math.random() < 0.5) {
    c.imprisoned = { reason: "treason", yearsRemaining: 3 + Math.floor(Math.random() * 5) };
    return { log: [`The ${flavor} failed - imprisoned for treason.`], success: false };
  }
  c.stats.influence = clamp(c.stats.influence - 15);
  c.stats.popularity = clamp(c.stats.popularity - 10);
  return { log: [`The ${flavor} failed.`], success: false };
}

// Military-track characters at tier 3+ can attempt to absorb or destroy a
// rival nation (Section 6). Permanently recorded on the dynasty.
export function attemptConquest(c: Character, dynasty: Dynasty, targetNation: string, mode: "absorbed" | "destroyed"): ActionResult {
  if (c.trackId !== "military" || c.trackTier < 3) {
    return { log: ["Only a military commander at the highest rank can attempt conquest."], success: false };
  }
  const epoch = EPOCH_BY_ID[c.epochId];
  if (targetNation === c.nation || !epoch.nations.includes(targetNation)) {
    return { log: ["Invalid target nation."], success: false };
  }
  if (dynasty.conqueredNations.some((cn) => cn.nation === targetNation)) {
    return { log: [`${targetNation} is already under the dynasty's control.`], success: false };
  }
  const odds = clamp((c.stats.skill + c.stats.influence) / 2 - dynasty.nationPower / 2 + 30, 5, 90) / 100;
  if (Math.random() < odds) {
    dynasty.conqueredNations.push({ nation: targetNation, mode, year: c.year, integration: 50 });
    dynasty.nationPower = clamp(dynasty.nationPower + (mode === "destroyed" ? 15 : 10));
    c.stats.influence = clamp(c.stats.influence + 15);
    dynasty.eventTicker.push({ year: c.year, text: `${c.name} ${mode} ${targetNation}.` });
    return { log: [`${targetNation} has been ${mode} into the dynasty's domain.`], success: true };
  }
  c.stats.health = clamp(c.stats.health - 20);
  c.stats.influence = clamp(c.stats.influence - 10);
  return { log: [`The campaign against ${targetNation} failed, at great cost.`], success: false };
}

// Forging an alliance automatically sours relations with a random other
// rival (Section 6: "a real trade-off, not an independent bilateral
// choice").
export function forgeAlliance(c: Character, dynasty: Dynasty, targetNation: string): ActionResult {
  const epoch = EPOCH_BY_ID[c.epochId];
  if (targetNation === c.nation || !epoch.nations.includes(targetNation)) {
    return { log: ["Invalid target nation."], success: false };
  }
  dynasty.worldRelations[targetNation] = clamp((dynasty.worldRelations[targetNation] ?? 50) + 20);
  c.relations[targetNation] = dynasty.worldRelations[targetNation];
  const log = [`Forged an alliance with ${targetNation}.`];
  const others = epoch.nations.filter((n) => n !== targetNation && n !== c.nation);
  if (others.length) {
    const rival = others[Math.floor(Math.random() * others.length)];
    dynasty.worldRelations[rival] = clamp((dynasty.worldRelations[rival] ?? 50) - 15);
    c.relations[rival] = dynasty.worldRelations[rival];
    log.push(`${rival} grew wary of the new alliance, and relations soured.`);
  }
  return { log, success: true };
}

// Dynasty Action: send spies into a rival nation for a real chance at
// advantage, with a real cost if caught (Section 6).
const ESPIONAGE_COST = 20;
export function sendEspionage(c: Character, dynasty: Dynasty, targetNation: string): ActionResult {
  const epoch = EPOCH_BY_ID[c.epochId];
  if (targetNation === c.nation || !epoch.nations.includes(targetNation)) {
    return { log: ["Invalid target nation."], success: false };
  }
  if (dynasty.legacyPoints < ESPIONAGE_COST) {
    return { log: [`Espionage requires ${ESPIONAGE_COST} legacy points.`], success: false };
  }
  dynasty.legacyPoints -= ESPIONAGE_COST;
  const odds = 0.55 + c.stats.skill / 500;
  if (Math.random() < odds) {
    c.stats.influence = clamp(c.stats.influence + 10);
    dynasty.worldRelations[targetNation] = clamp((dynasty.worldRelations[targetNation] ?? 50) - 5);
    return { log: [`Spies gathered valuable intelligence on ${targetNation}.`], success: true };
  }
  dynasty.worldRelations[targetNation] = clamp((dynasty.worldRelations[targetNation] ?? 50) - 25);
  c.stats.popularity = clamp(c.stats.popularity - 8);
  return { log: [`Spies were caught in ${targetNation} - a diplomatic embarrassment.`], success: false };
}

// Real choices to pacify (costly), suppress (popularity cost), or ignore
// (handled by the natural decay in tickGeopolitics) a conquered nation's
// integration level (Section 6).
const PACIFY_COST = 30;
export function manageIntegration(c: Character, dynasty: Dynasty, nation: string, action: "pacify" | "suppress"): ActionResult {
  const cn = dynasty.conqueredNations.find((x) => x.nation === nation);
  if (!cn) return { log: ["That nation is not under the dynasty's control."], success: false };
  if (action === "pacify") {
    if (c.stats.wealth < PACIFY_COST) return { log: [`Pacifying ${nation} requires ${PACIFY_COST} wealth.`], success: false };
    c.stats.wealth = clamp(c.stats.wealth - PACIFY_COST, 0, 999);
    cn.integration = clamp(cn.integration + 25);
    return { log: [`Invested in pacifying ${nation}, easing tensions.`], success: true };
  }
  cn.integration = clamp(cn.integration + 12);
  c.stats.popularity = clamp(c.stats.popularity - 6);
  return { log: [`Suppressed unrest in ${nation} by force.`], success: true };
}

// Convert to a foreign nation's ways for better relations there, at a real
// popularity cost at home (Section 6); recurring suspicion is handled in
// tickGeopolitics.
export function convertFaith(c: Character, dynasty: Dynasty, targetNation: string): ActionResult {
  const epoch = EPOCH_BY_ID[c.epochId];
  if (targetNation === c.nation || !epoch.nations.includes(targetNation)) {
    return { log: ["Invalid target nation."], success: false };
  }
  c.convertedFaith = targetNation;
  dynasty.worldRelations[targetNation] = clamp((dynasty.worldRelations[targetNation] ?? 50) + 25);
  c.relations[targetNation] = dynasty.worldRelations[targetNation];
  c.stats.popularity = clamp(c.stats.popularity - 10);
  return { log: [`Converted to the ways of ${targetNation}, straining standing at home but easing relations abroad.`], success: true };
}

// Court factions: real events force choosing a side, strengthening it at
// the other two's expense (Section 6).
export function courtFactionSupport(c: Character, faction: CourtFaction): ActionResult {
  c.factionStanding[faction] = clamp(c.factionStanding[faction] + 15);
  for (const f of COURT_FACTIONS) {
    if (f !== faction) c.factionStanding[f] = clamp(c.factionStanding[f] - 8);
  }
  return { log: [`Threw their support behind ${faction}.`], success: true };
}
