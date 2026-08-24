import type { Character } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 999): number {
  return Math.max(lo, Math.min(hi, n));
}

// Automatic economic events (Section 7). Distinct from Estate's
// player-initiated risky venture (server/src/routes/economy.ts's
// /venture route, a deliberate choice with a stake the player sets): these
// are small windfalls, losses, and a scaled-down ambient venture triggered
// by the character's own turn state (wealth, property, track standing)
// rather than the player remembering to visit Estate. Previously the
// economy only ever moved when the player took an explicit action - a
// character who never opened Estate had a static financial life outside
// salary and property income.

type EconomicEvent = {
  id: string;
  eligible: (c: Character) => boolean;
  apply: (c: Character) => string;
};

const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: "windfallInheritance",
    eligible: () => true,
    apply: (c) => {
      const amount = 15 + Math.floor(Math.random() * 30);
      c.stats.wealth = clamp(c.stats.wealth + amount);
      return `A distant relative's estate brought an unexpected windfall of ${amount} wealth.`;
    },
  },
  {
    id: "theft",
    eligible: (c) => c.stats.wealth > 60,
    apply: (c) => {
      const amount = Math.min(c.stats.wealth, 10 + Math.floor(Math.random() * 25));
      c.stats.wealth = clamp(c.stats.wealth - amount);
      return `Thieves made off with ${amount} wealth from the household.`;
    },
  },
  {
    id: "taxDemand",
    eligible: (c) => c.trackTier >= 2,
    apply: (c) => {
      const amount = Math.min(c.stats.wealth, 10 + Math.floor(Math.random() * 20));
      c.stats.wealth = clamp(c.stats.wealth - amount);
      c.stats.popularity = clamp(c.stats.popularity - 1, 0, 100);
      return `A tax levy on those of standing cost ${amount} wealth.`;
    },
  },
  {
    id: "marketDownturn",
    eligible: (c) => c.properties.length > 0,
    apply: (c) => {
      const amount = 10 + Math.floor(Math.random() * 20);
      c.stats.wealth = clamp(c.stats.wealth - amount);
      return `A market downturn dented the value of held property, a loss of ${amount} wealth.`;
    },
  },
  {
    id: "businessOpportunity",
    eligible: (c) => c.stats.wealth >= 20,
    apply: (c) => {
      const stake = Math.min(c.stats.wealth, 15 + Math.floor(Math.random() * 20));
      const roll = Math.random();
      let multiplier: number;
      let label: string;
      if (roll < 0.25) {
        multiplier = 0;
        label = "fell through entirely";
      } else if (roll < 0.55) {
        multiplier = 0.5;
        label = "returned only a partial profit";
      } else if (roll < 0.85) {
        multiplier = 1.5;
        label = "paid off modestly";
      } else {
        multiplier = 3;
        label = "paid off handsomely";
      }
      c.stats.wealth = clamp(c.stats.wealth - stake);
      const payout = Math.round(stake * multiplier);
      c.stats.wealth = clamp(c.stats.wealth + payout);
      c._sentVenture = true;
      return `A passing business opportunity ${label} - staked ${stake}, returned ${payout}.`;
    },
  },
];

export type EconomicEventResult = { log: string[] };

export function tickEconomicEvents(c: Character): EconomicEventResult {
  if (Math.random() >= 0.25) return { log: [] };
  const eligible = ECONOMIC_EVENTS.filter((e) => e.eligible(c));
  if (eligible.length === 0) return { log: [] };
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  return { log: [chosen.apply(c)] };
}
