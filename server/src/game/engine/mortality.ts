import type { Character } from "@dynasty/shared";

const NATURAL_CAUSES = ["old age", "a lingering illness", "a fever that would not break", "a failing heart"];
const YOUNG_CAUSES = ["a childhood illness", "an accident", "a difficult winter"];

// Era-accurate mortality. Previously a single flat age/health curve applied
// regardless of what year the character was actually living in, so a Bronze
// Age farmer and a 21st-century professional faced identical odds of
// reaching 80 - deaths landed at essentially random ages rather than ones
// that felt period-appropriate. Real historical life expectancy was driven
// by two mostly-separate effects that don't move at the same rate: much
// higher childhood mortality in the pre-modern world (medicine slashed that
// decades before it meaningfully extended adult lifespan), and adults'
// natural "old age" decline arriving earlier - someone who survived
// childhood in the Bronze Age could still live into their 50s, but rarely
// much past that, versus 80s+ today. Modeled as two small piecewise-linear
// control-point tables keyed on in-game year rather than a single number.
const LIFESPAN_CONTROL_POINTS: [year: number, targetLifespan: number][] = [
  [-3000, 45],
  [-500, 50],
  [500, 48],
  [1200, 50],
  [1500, 50],
  [1650, 52],
  [1750, 55],
  [1850, 60],
  [1897, 63],
  [1950, 72],
  [1980, 76],
  [2000, 80],
];

const CHILD_MORTALITY_CONTROL_POINTS: [year: number, multiplier: number][] = [
  [-3000, 6],
  [500, 5.5],
  [1500, 4.5],
  [1750, 3.5],
  [1850, 2.5],
  [1897, 1.8],
  [1950, 0.6],
  [1980, 0.25],
  [2000, 0.12],
];

function interpolate(points: [number, number][], year: number): number {
  if (year <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (year >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const [y0, v0] = points[i];
    const [y1, v1] = points[i + 1];
    if (year >= y0 && year <= y1) return v0 + (v1 - v0) * ((year - y0) / (y1 - y0));
  }
  return last[1];
}

export function targetLifespan(year: number): number {
  return interpolate(LIFESPAN_CONTROL_POINTS, year);
}

export function childMortalityMultiplier(year: number): number {
  return interpolate(CHILD_MORTALITY_CONTROL_POINTS, year);
}

// Scales an actual age onto the ~80-year-lifespan curve every age-tiered
// check (here and in family.ts's NPC mortality) is written against, so the
// same tier logic naturally lands earlier for eras with a shorter typical
// lifespan instead of every era assuming a modern one.
export function eraAdjustedAge(age: number, year: number): number {
  return age * (80 / targetLifespan(year));
}

export function mortalityChance(age: number, health: number, year: number): number {
  const shiftedAge = eraAdjustedAge(age, year);
  let base = age < 15 ? 0.004 * childMortalityMultiplier(year) : 0.0015;
  if (shiftedAge > 40) base += (shiftedAge - 40) * 0.0012;
  if (shiftedAge > 60) base += (shiftedAge - 60) * 0.0025;
  if (shiftedAge > 80) base += (shiftedAge - 80) * 0.004;
  const healthFactor = 1 + (100 - health) / 60;
  return Math.min(base * healthFactor, 0.92);
}

export function rollMortality(c: Character): string | null {
  const chance = mortalityChance(c.age, c.stats.health, c.year);
  if (Math.random() >= chance) return null;
  const pool = c.age < 15 ? YOUNG_CAUSES : NATURAL_CAUSES;
  return pool[Math.floor(Math.random() * pool.length)];
}
