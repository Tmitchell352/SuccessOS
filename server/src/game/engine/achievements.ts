import type { Character, Dynasty } from "@dynasty/shared";

// Achievements + victory conditions (Section 1's "dynastyAchievements" /
// "victory goals", handoff Section 9's step 1 - "Achievement/legacy-point
// checks, victory condition check" - which was the very first item in the
// turn structure and, until now, entirely unimplemented (marked TODO since
// the first commit).

const LEGACY_POINTS_PER_FIRST_UNLOCK = 15;

function unlock(c: Character, dynasty: Dynasty, id: string, log: string[], label: string): void {
  if (!c.achievements.includes(id)) c.achievements.push(id);
  if (!dynasty.everUnlockedAchievements.includes(id)) {
    dynasty.everUnlockedAchievements.push(id);
    dynasty.dynastyAchievements.push(id);
    dynasty.legacyPoints += LEGACY_POINTS_PER_FIRST_UNLOCK;
    log.push(`Achievement unlocked: ${label}.`);
  }
}

export function tickAchievements(c: Character, dynasty: Dynasty): { log: string[] } {
  const log: string[] = [];

  if (c.trackTier === 3) unlock(c, dynasty, "masterOfTheCraft", log, "Master of the Craft");
  if (c.trackId === "political" && c.trackTier === 3) unlock(c, dynasty, "ascendTheThrone", log, "Ascend the Throne");
  if (dynasty.conqueredNations.length >= 1) unlock(c, dynasty, "firstConquest", log, "First Conquest");
  if (dynasty.conqueredNations.length >= 3) unlock(c, dynasty, "empireBuilder", log, "Empire Builder");
  if (c.stats.wealth >= 900) unlock(c, dynasty, "fabulouslyWealthy", log, "Fabulously Wealthy");
  if (c._wasDestitute && c.stats.wealth > 100) unlock(c, dynasty, "ragsToRiches", log, "Rags to Riches");
  if (c.family.children.length >= 5) unlock(c, dynasty, "prolificParent", log, "Prolific Parent");
  if (c.alive && c.age >= 90) unlock(c, dynasty, "aLongLife", log, "A Long Life");
  if (c.conditions.includes("battle wound") && c.alive) unlock(c, dynasty, "battleScarred", log, "Battle-Scarred Survivor");
  if (c.trackId === "academic" && c.possessions.length >= 5) unlock(c, dynasty, "prolificScholar", log, "Prolific Scholar");
  if (c.trackId === "religious" && c.followers >= 150) unlock(c, dynasty, "belovedProphet", log, "Beloved Prophet");
  if (c.trackId === "criminal" && c.trackTier === 3) unlock(c, dynasty, "crimeLord", log, "Crime Lord");
  if (c._erasWitnessed.length >= 3) unlock(c, dynasty, "witnessToHistory", log, "Witness to History");
  if (dynasty.firedMilestones.length >= 10) unlock(c, dynasty, "livingThroughHistory", log, "Living Through History");
  if (c._survivedCrisis) unlock(c, dynasty, "weatheredTheStorm", log, "Weathered the Storm");
  if (c._sentVenture) unlock(c, dynasty, "calculatedRisk", log, "Calculated Risk");

  const maxGeneration = Object.values(dynasty.people).reduce((max, p) => Math.max(max, p.generation), 0);
  if (maxGeneration >= 10) unlock(c, dynasty, "generationalLegacy", log, "Generational Legacy");

  return { log };
}

export type VictoryCheckResult = { log: string[]; achieved: boolean };

// Victory goals (Section 1): chosen at dynasty founding (Dynasty.victoryGoal
// was always "none" before now - see routes/dynasties.ts), checked every
// turn once set.
export function checkVictory(dynasty: Dynasty, year: number): VictoryCheckResult {
  if (dynasty.victoryGoal === "none" || dynasty.victoryAchieved) return { log: [], achieved: false };

  const maxGeneration = Object.values(dynasty.people).reduce((max, p) => Math.max(max, p.generation), 0);
  const met =
    (dynasty.victoryGoal === "gen10" && maxGeneration >= 10) ||
    (dynasty.victoryGoal === "legacy300" && dynasty.legacyPoints >= 300) ||
    (dynasty.victoryGoal === "legacy750" && dynasty.legacyPoints >= 750);

  if (!met) return { log: [], achieved: false };

  dynasty.victoryAchieved = true;
  const label =
    dynasty.victoryGoal === "gen10" ? "reaching the 10th generation" : dynasty.victoryGoal === "legacy300" ? "amassing 300 legacy points" : "amassing 750 legacy points";
  dynasty.eventTicker.push({ year, text: `The dynasty has achieved victory by ${label}.` });
  return { log: [`Victory! The dynasty has triumphed by ${label}.`], achieved: true };
}
