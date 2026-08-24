import type { Character } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export type TrackTickResult = { log: string[]; deathCause?: string };

// Per-track distinct mechanics, per docs/DYNASTY_HANDOFF.md Section 5's
// table. Only Military, Commercial, and Political are implemented - the
// other 7 tracks (Religious/followers+schism, Criminal/heat meter,
// Academic/treatises, Medical/difficult cases, Maritime/voyages,
// Artisan/masterworks, Sports/rival) still fall back to the generic
// salary/tier progression in ./turn.ts. Called once per year for the
// character's current track, before the mortality roll in advanceYear.
export function tickTrackMechanic(c: Character): TrackTickResult {
  const log: string[] = [];
  if (!c.trackId || c.retired) return { log };

  switch (c.trackId) {
    case "military": {
      // Real campaign events with injury/death risk (Section 5's table).
      if (Math.random() < 0.2) {
        const roll = Math.random();
        if (roll < 0.15) {
          return { log: [`${c.name} fell in battle.`], deathCause: "died in battle" };
        } else if (roll < 0.4) {
          c.stats.health = clamp(c.stats.health - 15);
          c.conditions.push("battle wound");
          log.push("Wounded in a campaign.");
        } else {
          c.stats.influence = clamp(c.stats.influence + 5);
          c.stats.skill = clamp(c.stats.skill + 3);
          log.push("Distinguished themself in a campaign.");
        }
      }
      break;
    }

    case "commercial": {
      // High-stakes "major deal" events - aggressive negotiation is a real
      // coin-flip, skill-weighted (Section 5's table).
      if (Math.random() < 0.25) {
        const odds = 0.4 + c.stats.skill / 250;
        if (Math.random() < odds) {
          const gain = 20 + Math.round(Math.random() * 40);
          c.stats.wealth = clamp(c.stats.wealth + gain, 0, 999);
          log.push(`Closed a major deal, gaining ${gain} wealth.`);
        } else {
          const loss = 10 + Math.round(Math.random() * 30);
          c.stats.wealth = clamp(c.stats.wealth - loss, 0, 999);
          c.stats.popularity = clamp(c.stats.popularity - 3);
          log.push(`A major deal fell through, losing ${loss} wealth.`);
        }
      }
      break;
    }

    case "political": {
      // Elite vs. commoner standing split (Section 5's table): eliteStanding
      // tracks separately from popularity and has to be actively courted,
      // not just accumulated as a side effect of the salary tick.
      const drift = c.eliteStanding > 50 ? -1 : c.eliteStanding < 50 ? 1 : 0;
      c.eliteStanding = clamp(c.eliteStanding + drift);
      if (Math.random() < 0.15) {
        if (c.eliteStanding >= c.stats.popularity) {
          c.eliteStanding = clamp(c.eliteStanding + 4);
          log.push("Courted favor among the elite.");
        } else {
          c.stats.popularity = clamp(c.stats.popularity + 4);
          log.push("Courted favor among the common people.");
        }
      }
      break;
    }
  }

  return { log };
}
