import type { Character, CourtFaction } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

// Broader life events, per docs/DYNASTY_HANDOFF.md Section 9 steps 7 and 10:
// step 10's "conversion opportunity, court faction event, family reunion,
// family council, parenting choice, sibling interaction, marriage
// prospects, protege offer/growth," plus step 7's "notification-only
// events (world event, rival strike, mentor/friend/spouse gift)" - world
// events fire separately in turn.ts's step 12, the rest live here. Marriage,
// parenting, conversion, and court-faction support already exist as
// explicit player actions elsewhere in this rebuild (Family/Dynasty Actions
// screens) - deliberately, matching this codebase's overall split of
// "automatic ambient effects tick every turn, real choices are routes" (see
// README's geopolitics section for the same reasoning). What was missing
// was the ambient flavor layer: small, automatic, log-only beats that make
// an otherwise quiet non-milestone, non-track-event turn feel less empty,
// and that nudge the player toward those explicit actions (a
// marriage-prospects notice, a conversion opportunity) rather than
// silently doing nothing until they think to check.
//
// At most one fires per turn (a 35% chance to roll at all, then one picked
// from whichever are eligible) - these are meant to be an occasional beat
// alongside the turn's other events, not a second narrative competing with
// the AI/track/geopolitics log lines every year.

type LifeEvent = {
  id: string;
  eligible: (c: Character) => boolean;
  apply: (c: Character) => string;
};

const LIFE_EVENTS: LifeEvent[] = [
  {
    id: "familyReunion",
    eligible: (c) => c.family.status === "married" || c.siblings.length > 0 || c.family.children.length > 0,
    apply: (c) => {
      c.stats.popularity = clamp(c.stats.popularity + 2);
      if (c.family.spouseBond !== undefined) c.family.spouseBond = clamp(c.family.spouseBond + 3);
      return "A family reunion brought warmth to a difficult year.";
    },
  },
  {
    id: "familyCouncil",
    eligible: (c) => c.trackTier >= 1,
    apply: (c) => {
      c.stats.influence = clamp(c.stats.influence + 2);
      return "A family council debated the dynasty's direction and settled on a steadier course.";
    },
  },
  {
    id: "siblingInteraction",
    eligible: (c) => c.siblings.length > 0,
    apply: (c) => {
      const sibling = c.siblings[Math.floor(Math.random() * c.siblings.length)];
      if (Math.random() < 0.7) {
        c.stats.wealth = clamp(c.stats.wealth + 10, 0, 999);
        return `${sibling.name} sent a generous gift.`;
      }
      c.stats.popularity = clamp(c.stats.popularity - 2);
      return `A dispute over inheritance with ${sibling.name} soured the year.`;
    },
  },
  {
    id: "protegeGrowth",
    eligible: (c) => !!c.protegeName,
    apply: (c) => {
      c.protegeBond = clamp((c.protegeBond ?? 50) + 5);
      c.stats.influence = clamp(c.stats.influence + 1);
      return `${c.protegeName} showed real promise this year, reflecting well on their mentor.`;
    },
  },
  {
    id: "marriageProspectsNoticed",
    eligible: (c) => c.family.status === "single" && c.age >= 16 && c.age <= 55,
    apply: (c) => `Word has spread that ${c.name} is of an age to marry - suitors have begun to take notice.`,
  },
  {
    id: "conversionOpportunity",
    eligible: (c) => !c.convertedFaith,
    apply: () => "A traveling missionary passed through, offering a glimpse of a different faith.",
  },
  {
    id: "factionOverture",
    eligible: (c) => Object.values(c.factionStanding).some((v) => v < 60),
    apply: (c) => {
      const low = (Object.entries(c.factionStanding) as [CourtFaction, number][]).filter(([, v]) => v < 60);
      const [faction] = low[Math.floor(Math.random() * low.length)];
      c.factionStanding[faction] = clamp(c.factionStanding[faction] + 3);
      return `${faction} extended a small overture of goodwill.`;
    },
  },
  // Section 9 step 7's "notification-only events (world event, rival
  // strike, mentor/friend/spouse gift)" - the world-event half already
  // fires in turn.ts's step 12; rival strikes and NPC gifts had no
  // implementation anywhere until now.
  {
    id: "rivalStrike",
    eligible: (c) => !!c.domestic.rivalName,
    apply: (c) => {
      c.stats.popularity = clamp(c.stats.popularity - 4);
      c.domestic.rivalTension = clamp((c.domestic.rivalTension ?? 50) + 8);
      return `${c.domestic.rivalName} spread damaging rumors, souring public opinion.`;
    },
  },
  {
    id: "mentorGift",
    eligible: (c) => !!c.domestic.mentorName,
    apply: (c) => {
      const amount = 10 + Math.floor(Math.random() * 20);
      c.stats.wealth = clamp(c.stats.wealth + amount, 0, 999);
      c.domestic.mentorTrust = clamp((c.domestic.mentorTrust ?? 50) + 3);
      return `${c.domestic.mentorName} passed along ${amount} wealth's worth of advice and connections.`;
    },
  },
  {
    id: "friendGift",
    eligible: (c) => !!c.domestic.friendName,
    apply: (c) => {
      c.stats.popularity = clamp(c.stats.popularity + 4);
      c.domestic.friendBond = clamp((c.domestic.friendBond ?? 50) + 3);
      return `${c.domestic.friendName} spoke well of them all over town.`;
    },
  },
  {
    id: "spouseGift",
    eligible: (c) => c.family.status === "married",
    apply: (c) => {
      const amount = 10 + Math.floor(Math.random() * 20);
      c.stats.wealth = clamp(c.stats.wealth + amount, 0, 999);
      c.family.spouseBond = clamp((c.family.spouseBond ?? 50) + 3);
      return `${c.family.spouseName} surprised them with a thoughtful gift worth ${amount} wealth.`;
    },
  },
];

export type LifeEventResult = { log: string[] };

export function tickLifeEvents(c: Character): LifeEventResult {
  if (Math.random() >= 0.35) return { log: [] };
  const eligible = LIFE_EVENTS.filter((e) => e.eligible(c));
  if (eligible.length === 0) return { log: [] };
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  return { log: [chosen.apply(c)] };
}
