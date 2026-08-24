import type { Character, Dynasty } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

// Legendary event roll (Section 9 step 12): a rare, higher-magnitude
// counterpart to the ordinary life-event and economic-event pools
// (lifeEvents.ts, economicEvents.ts) - a genuinely memorable moment rather
// than routine flavor. Grants a meaningful stat boost and a real legacy
// -point reward, closer in size to an achievement unlock than an everyday
// turn event, gated behind a low (~2%/year) chance so it stays rare.
const LEGENDARY_EVENT_LEGACY_POINTS = 5;

type LegendaryEvent = {
  id: string;
  apply: (c: Character) => string;
};

const LEGENDARY_EVENTS: LegendaryEvent[] = [
  {
    id: "brushWithHistory",
    apply: (c) => {
      c.stats.influence = clamp(c.stats.influence + 10);
      c.stats.popularity = clamp(c.stats.popularity + 8);
      return `${c.name} crossed paths with one of the great figures of the age - a moment people would speak of for years.`;
    },
  },
  {
    id: "featOfDaring",
    apply: (c) => {
      c.stats.skill = clamp(c.stats.skill + 8);
      c.stats.popularity = clamp(c.stats.popularity + 10);
      return `A feat of remarkable daring made ${c.name}'s name known well beyond their usual circles.`;
    },
  },
  {
    id: "strokeOfBrilliance",
    apply: (c) => {
      c.stats.skill = clamp(c.stats.skill + 12);
      c.stats.influence = clamp(c.stats.influence + 5);
      return `A single stroke of brilliance solved a problem that had confounded others for years.`;
    },
  },
  {
    id: "fortuneSmiles",
    apply: (c) => {
      const amount = 60 + Math.floor(Math.random() * 80);
      c.stats.wealth = clamp(c.stats.wealth + amount, 0, 999);
      return `An extraordinary stroke of fortune brought ${amount} wealth from an entirely unexpected source.`;
    },
  },
  {
    id: "heroicAct",
    apply: (c) => {
      c.stats.popularity = clamp(c.stats.popularity + 15);
      c.stats.health = clamp(c.stats.health - 5);
      return `${c.name} performed a genuinely heroic act, at real personal cost, that will be remembered for a generation.`;
    },
  },
];

export type LegendaryEventResult = { log: string[] };

export function tickLegendaryEvent(c: Character, dynasty: Dynasty): LegendaryEventResult {
  if (Math.random() >= 0.02) return { log: [] };
  const chosen = LEGENDARY_EVENTS[Math.floor(Math.random() * LEGENDARY_EVENTS.length)];
  const text = chosen.apply(c);
  dynasty.legacyPoints += LEGENDARY_EVENT_LEGACY_POINTS;
  return { log: [`${text} (+${LEGENDARY_EVENT_LEGACY_POINTS} legacy points)`] };
}
