import type { Character, Child, Dynasty } from "@dynasty/shared";
import { randomName } from "./factory.js";
import { eraAdjustedAge } from "./mortality.js";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

// Dynasty.almanac ("named NPCs encountered, for reference screen" - Section
// 2) existed since the first commit with nothing that ever wrote to it.
function remember(dynasty: Dynasty, name: string): void {
  if (!dynasty.almanac.includes(name)) dynasty.almanac.push(name);
}

// Family & Relationships systems, per docs/DYNASTY_HANDOFF.md Section 8.
//
// tickFamily is automatic, called once per year from ./turn.ts: children
// being born, mentor/rival/friend/protege acquisition and mortality, spouse
// mortality, and a cheap background simulation for unplayed siblings.
// Domestic NPCs previously only ever aged or died off if they already
// existed - nothing anywhere ever assigned one, so in normal play they
// never appeared at all. Marriage and parenting are explicit player
// choices, exposed via server/src/routes/family.ts.
//
// STATUS: covers marriage (deterministic suitor prospects + arranged
// alliance), children being born, active parenting choices that leave a
// real stat mark on the child at heir activation, domestic NPC + spouse
// mortality, and a cheap sibling death/departure simulation. Inheritance
// friction and will-style splits (also Section 8's "Wills" bullet) are
// applied in routes/turn.ts's choose-heir handler, since that's where the
// deceased's estate and the chosen heir are both in scope.

export type SuitorProspect = {
  name: string;
  trait: "wealthy" | "charming" | "influential" | "humble";
  description: string;
  wealthDelta: number; // dowry, can be negative (bride-price paid out)
  bondStart: number;
};

const SUITOR_TRAITS: { trait: SuitorProspect["trait"]; description: string; wealthDelta: [number, number]; bondStart: [number, number] }[] = [
  { trait: "wealthy", description: "brings a substantial dowry, but expects a life of comfort", wealthDelta: [40, 90], bondStart: [30, 50] },
  { trait: "charming", description: "is beloved by all who meet them", wealthDelta: [-10, 10], bondStart: [55, 75] },
  { trait: "influential", description: "has powerful family connections", wealthDelta: [0, 20], bondStart: [35, 55] },
  { trait: "humble", description: "offers little but genuine devotion", wealthDelta: [-20, 5], bondStart: [60, 80] },
];

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// Deterministic fallback suitor generation (Section 8: "either AI-generated
// named suitors ... or a deterministic fallback (No AI mode)"). This is the
// fallback path - the AI-generated version (generateSuitors) is one of the
// three remaining AI call sites, still TODO.
export function generateSuitorProspects(character: Character): SuitorProspect[] {
  const shuffled = [...SUITOR_TRAITS].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((t) => ({
    name: randomName(),
    trait: t.trait,
    description: t.description,
    wealthDelta: randInt(...t.wealthDelta),
    bondStart: randInt(...t.bondStart),
  }));
}

export type MarryResult = { log: string[]; success: boolean };

export function marry(character: Character, dynasty: Dynasty, suitor: SuitorProspect, arrangedWithNation?: string): MarryResult {
  if (character.family.status === "married") {
    return { log: ["Already married."], success: false };
  }
  if (character.age < 16) {
    return { log: ["Too young to marry."], success: false };
  }
  character.family.status = "married";
  character.family.spouseName = suitor.name;
  character.family.spouseAge = clamp(character.age + randInt(-5, 5), 14, 90);
  character.family.spouseBond = suitor.bondStart;
  character.stats.wealth = clamp(character.stats.wealth + suitor.wealthDelta, 0, 999);
  remember(dynasty, suitor.name);

  const log = [`Married ${suitor.name}, who ${suitor.description}.`];

  // Arranged-alliance marriage, tied to world relations (Section 8).
  if (arrangedWithNation) {
    dynasty.worldRelations[arrangedWithNation] = clamp((dynasty.worldRelations[arrangedWithNation] ?? 50) + 20);
    character.relations[arrangedWithNation] = dynasty.worldRelations[arrangedWithNation];
    character.stats.popularity = clamp(character.stats.popularity - 5);
    log.push(`The marriage was arranged to strengthen ties with ${arrangedWithNation}.`);
  }

  return { log, success: true };
}

export type ParentingStyle = "strict" | "permissive" | "educate" | "labor";

export type ParentingResult = { log: string[]; success: boolean };

// Active parenting choices while a child is still a minor (Section 8) -
// these accumulate on the child and are converted into real stat bonuses
// when the child becomes the playable heir (see computeHeirStatBonuses),
// distinct from passively-inherited traits.
export function applyParenting(character: Character, childName: string, style: ParentingStyle): ParentingResult {
  const child = character.family.children.find((c) => c.name === childName);
  if (!child) return { log: ["No such child."], success: false };
  if (child.age >= 18) return { log: [`${childName} is already an adult.`], success: false };
  child.parenting.push(style);
  const flavor: Record<ParentingStyle, string> = {
    strict: "raised with firm discipline",
    permissive: "given the freedom to find their own way",
    educate: "given every opportunity to learn",
    labor: "put to work early to support the family",
  };
  return { log: [`${childName} is being ${flavor[style]}.`], success: true };
}

// Converts a child's accumulated parenting choices + inherited traits into
// starting stat bonuses once they become the playable heir. Each style is
// capped at 5 applications so repeatedly calling the endpoint can't be
// gamed into an unbounded bonus.
export function computeHeirStatBonuses(child: Child): Partial<Character["stats"]> {
  const bonus: Partial<Character["stats"]> = { influence: 0, skill: 0, wealth: 0, health: 0, popularity: 0 };
  const counts: Record<ParentingStyle, number> = { strict: 0, permissive: 0, educate: 0, labor: 0 };
  for (const p of child.parenting) {
    if (p in counts) counts[p as ParentingStyle] = Math.min(5, counts[p as ParentingStyle] + 1);
  }
  bonus.skill! += counts.strict * 2 + counts.educate * 3;
  bonus.popularity! += counts.permissive * 2 - counts.strict * 1;
  bonus.influence! += counts.educate * 2;
  bonus.wealth! += counts.labor * 4;
  bonus.health! -= counts.labor * 2;
  for (const trait of child.traits) {
    if (trait === "gifted") bonus.skill! += 5;
    if (trait === "charismatic") bonus.popularity! += 5;
    if (trait === "frail") bonus.health! -= 5;
    if (trait === "ambitious") bonus.influence! += 5;
  }
  return bonus;
}

export type FamilyTickResult = { log: string[] };

export function tickFamily(c: Character, dynasty: Dynasty): FamilyTickResult {
  const log: string[] = [];

  // Children being born (Section 8: "born via events, age alongside the
  // player").
  if (c.family.status === "married" && c.age >= 16 && c.age <= 45 && c.family.children.length < 8) {
    if (Math.random() < 0.12) {
      const name = randomName();
      const traits: string[] = [];
      if (Math.random() < 0.15) traits.push(["gifted", "charismatic", "frail", "ambitious"][Math.floor(Math.random() * 4)]);
      c.family.children.push({ name, age: 0, traits, giftedWealth: 0, parenting: [] });
      log.push(`${c.name} and ${c.family.spouseName ?? "their spouse"} welcomed a child, ${name}.`);
    }
  }

  // Spouse mortality (ages alongside domestic NPCs; Section 8 covers
  // mentor/rival/friend explicitly but the same real-mortality-risk
  // principle applies to a spouse). Era-adjusted (./mortality.ts) so a
  // spouse in the Bronze Age faces old-age risk on the same period-accurate
  // timeline the player character does, not a modern one.
  if (c.family.status === "married" && c.family.spouseAge !== undefined) {
    const spouseEraAge = eraAdjustedAge(c.family.spouseAge, c.year);
    const chance = spouseEraAge > 60 ? 0.02 : spouseEraAge > 40 ? 0.008 : 0.002;
    if (Math.random() < chance) {
      log.push(`${c.family.spouseName} has died. ${c.name} was widowed.`);
      c.family.status = "single";
      c.family.spouseName = undefined;
      c.family.spouseAge = undefined;
      c.family.spouseBond = undefined;
    }
  }

  // Domestic NPCs - mentor, rival, friend, protege (Section 8) - gained via
  // a small yearly chance when the slot is empty, previously never
  // assigned anywhere at all (only aged/killed off if one already
  // happened to be set, which nothing in normal play could cause).
  if (!c.domestic.mentorName && c.age >= 12 && c.age <= 50 && Math.random() < 0.06) {
    const name = randomName();
    c.domestic.mentorName = name;
    c.domestic.mentorTrust = 50;
    c.domestic.mentorAge = clamp(c.age + randInt(10, 30), 18, 90);
    remember(dynasty, name);
    log.push(`${name} has taken them on as a mentor.`);
  }
  if (!c.domestic.rivalName && c.age >= 10 && Math.random() < 0.05) {
    const name = randomName();
    c.domestic.rivalName = name;
    c.domestic.rivalTension = 50;
    c.domestic.rivalAge = clamp(c.age + randInt(-10, 10), 5, 90);
    remember(dynasty, name);
    log.push(`${name} has emerged as a rival.`);
  }
  if (!c.domestic.friendName && c.age >= 8 && Math.random() < 0.07) {
    const name = randomName();
    c.domestic.friendName = name;
    c.domestic.friendBond = 50;
    c.domestic.friendAge = clamp(c.age + randInt(-10, 10), 5, 90);
    remember(dynasty, name);
    log.push(`Became close friends with ${name}.`);
  }
  if (!c.protegeName && c.trackTier >= 2 && c.age >= 25 && Math.random() < 0.04) {
    const name = randomName();
    c.protegeName = name;
    c.protegeBond = 50;
    c.protegeAge = clamp(c.age - randInt(15, 25), 8, 90);
    remember(dynasty, name);
    log.push(`Took ${name} on as a protege.`);
  }

  if (c.domestic.mentorName && c.domestic.mentorAge !== undefined && eraAdjustedAge(c.domestic.mentorAge, c.year) > 55 && Math.random() < 0.03) {
    log.push(`${c.domestic.mentorName}, their mentor, has passed away.`);
    c.domestic.mentorName = undefined;
    c.domestic.mentorTrust = undefined;
    c.domestic.mentorAge = undefined;
  }
  if (c.domestic.rivalName && c.domestic.rivalAge !== undefined && eraAdjustedAge(c.domestic.rivalAge, c.year) > 55 && Math.random() < 0.02) {
    log.push(`${c.domestic.rivalName}, their rival, has died.`);
    c.domestic.rivalName = undefined;
    c.domestic.rivalTension = undefined;
    c.domestic.rivalAge = undefined;
  }
  if (c.domestic.friendName && c.domestic.friendAge !== undefined && eraAdjustedAge(c.domestic.friendAge, c.year) > 55 && Math.random() < 0.02) {
    log.push(`${c.domestic.friendName}, their friend, has passed away.`);
    c.domestic.friendName = undefined;
    c.domestic.friendBond = undefined;
    c.domestic.friendAge = undefined;
  }
  if (c.protegeName && c.protegeAge !== undefined && eraAdjustedAge(c.protegeAge, c.year) > 55 && Math.random() < 0.02) {
    log.push(`${c.protegeName}, their protege, has died.`);
    c.protegeName = undefined;
    c.protegeAge = undefined;
    c.protegeBond = undefined;
  }

  // Background relatives: unplayed siblings age off-screen via a cheap
  // simulation - no full parallel family tree, just a real chance of
  // dying or drifting away, matching Section 8's "cheap deterministic
  // simulation".
  const survivingSiblings = [];
  for (const s of c.siblings) {
    const sibEraAge = eraAdjustedAge(s.age, c.year);
    const deathChance = sibEraAge > 60 ? 0.02 : sibEraAge > 40 ? 0.006 : 0.0015;
    if (Math.random() < deathChance) {
      log.push(`Word arrives that their sibling ${s.name} has died.`);
    } else {
      survivingSiblings.push(s);
    }
  }
  c.siblings = survivingSiblings;

  return { log };
}
