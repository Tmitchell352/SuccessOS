import type { Character } from "@dynasty/shared";

const NATURAL_CAUSES = ["old age", "a lingering illness", "a fever that would not break", "a failing heart"];
const YOUNG_CAUSES = ["a childhood illness", "an accident", "a difficult winter"];

// Age/health-driven death probability. Deliberately simple compared to the
// original's richer cause-of-death event pool (track-specific campaign
// deaths, imprisonment, etc.) - those hook in via `extraCauses` per track
// once built (see Section 5's per-track mechanics, not yet implemented here).
export function mortalityChance(age: number, health: number): number {
  let base = age < 10 ? 0.004 : 0.0015;
  if (age > 40) base += (age - 40) * 0.0012;
  if (age > 60) base += (age - 60) * 0.0025;
  if (age > 80) base += (age - 80) * 0.004;
  const healthFactor = 1 + (100 - health) / 60;
  return Math.min(base * healthFactor, 0.92);
}

export function rollMortality(c: Character): string | null {
  const chance = mortalityChance(c.age, c.stats.health);
  if (Math.random() >= chance) return null;
  const pool = c.age < 15 ? YOUNG_CAUSES : NATURAL_CAUSES;
  return pool[Math.floor(Math.random() * pool.length)];
}
