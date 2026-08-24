import { randomUUID } from "node:crypto";
import type { Character } from "@dynasty/shared";
import { PROPERTY_TIER_BY_ID } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export type EconomyResult = { log: string[]; success: boolean };

// Property (Section 7): 6 tiers, one-time purchase cost + one-time bonus +
// recurring yearly income (the income itself ticks in ./turn.ts using
// PROPERTY_TIER_BY_ID; this is the purchase side, which didn't exist at all
// before - properties could only ever be inherited, never bought).
export function buyProperty(c: Character, typeId: string): EconomyResult {
  const tier = PROPERTY_TIER_BY_ID[typeId];
  if (!tier) return { log: ["No such property tier."], success: false };
  if (c.stats.wealth < tier.cost) return { log: [`${tier.label} costs ${tier.cost} wealth.`], success: false };
  c.stats.wealth = clamp(c.stats.wealth - tier.cost, 0, 999);
  c.properties.push({ id: randomUUID(), typeId, name: tier.label, boughtYear: c.year });
  if (tier.bonus.influence) c.stats.influence = clamp(c.stats.influence + tier.bonus.influence);
  if (tier.bonus.popularity) c.stats.popularity = clamp(c.stats.popularity + tier.bonus.popularity);
  if (tier.bonus.skill) c.stats.skill = clamp(c.stats.skill + tier.bonus.skill);
  if (tier.bonus.health) c.stats.health = clamp(c.stats.health + tier.bonus.health);
  return { log: [`Purchased a ${tier.label}.`], success: true };
}

// Debt/loans (Section 7): "a single debt slot" - interest already compounds
// yearly in ./turn.ts; this is the borrow/repay side, which didn't exist -
// debt could never actually be taken on before.
const MAX_LOAN = 300;
export function takeLoan(c: Character, amount: number): EconomyResult {
  if (c.debt) return { log: ["Already carrying a debt - pay it off before taking another loan."], success: false };
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_LOAN) {
    return { log: [`Loan amount must be between 1 and ${MAX_LOAN}.`], success: false };
  }
  c.debt = { principal: Math.round(amount) };
  c.stats.wealth = clamp(c.stats.wealth + Math.round(amount), 0, 999);
  return { log: [`Took out a loan of ${Math.round(amount)} wealth.`], success: true };
}

export function repayDebt(c: Character, amount: number): EconomyResult {
  if (!c.debt) return { log: ["No outstanding debt."], success: false };
  const pay = Math.min(c.stats.wealth, Math.round(amount), c.debt.principal);
  if (pay <= 0) return { log: ["Nothing to repay."], success: false };
  c.stats.wealth = clamp(c.stats.wealth - pay, 0, 999);
  c.debt.principal -= pay;
  const log = [`Repaid ${pay} wealth toward the debt.`];
  if (c.debt.principal <= 0) {
    c.debt = null;
    log.push("The debt is fully repaid.");
  }
  return { log, success: true };
}

// Risky ventures (Section 7): "5-tier random outcome table, total loss to
// 4.5x return." This is the general-economy version, available regardless
// of track - distinct from the Commercial/Maritime tracks' own venture
// -flavored mechanics in ./tracks.ts.
const VENTURE_OUTCOMES: { weight: number; multiplier: number; label: string }[] = [
  { weight: 15, multiplier: 0, label: "a total loss" },
  { weight: 25, multiplier: 0.4, label: "a partial loss" },
  { weight: 25, multiplier: 1.2, label: "a modest return" },
  { weight: 20, multiplier: 2.2, label: "a strong return" },
  { weight: 15, multiplier: 4.5, label: "an extraordinary return" },
];
const MAX_VENTURE_STAKE = 200;
export function attemptVenture(c: Character, stake: number): EconomyResult {
  if (!Number.isFinite(stake) || stake <= 0 || stake > MAX_VENTURE_STAKE) {
    return { log: [`Stake must be between 1 and ${MAX_VENTURE_STAKE}.`], success: false };
  }
  const roundedStake = Math.round(stake);
  if (c.stats.wealth < roundedStake) return { log: ["Not enough wealth to stake."], success: false };

  const totalWeight = VENTURE_OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * totalWeight;
  let outcome = VENTURE_OUTCOMES[0];
  for (const o of VENTURE_OUTCOMES) {
    roll -= o.weight;
    if (roll <= 0) {
      outcome = o;
      break;
    }
  }

  c.stats.wealth = clamp(c.stats.wealth - roundedStake, 0, 999);
  const payout = Math.round(roundedStake * outcome.multiplier);
  c.stats.wealth = clamp(c.stats.wealth + payout, 0, 999);
  return { log: [`Staked ${roundedStake} wealth on a venture - ${outcome.label}, returning ${payout}.`], success: true };
}

// Gifting (Section 7): "give wealth to living relatives (spouse, children -
// tracked as giftedWealth on the child, applied when they eventually
// become playable)." Nothing ever set giftedWealth before this.
const MAX_GIFT = 200;
export function giftToChild(c: Character, childName: string, amount: number): EconomyResult {
  const child = c.family.children.find((k) => k.name === childName);
  if (!child) return { log: ["No such child."], success: false };
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_GIFT) {
    return { log: [`Gift amount must be between 1 and ${MAX_GIFT}.`], success: false };
  }
  const rounded = Math.round(amount);
  if (c.stats.wealth < rounded) return { log: ["Not enough wealth to gift."], success: false };
  c.stats.wealth = clamp(c.stats.wealth - rounded, 0, 999);
  child.giftedWealth += rounded;
  return { log: [`Gifted ${rounded} wealth to ${childName}, to be inherited when they come of age.`], success: true };
}

export function giftToSpouse(c: Character, amount: number): EconomyResult {
  if (c.family.status !== "married") return { log: ["Not married."], success: false };
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_GIFT) {
    return { log: [`Gift amount must be between 1 and ${MAX_GIFT}.`], success: false };
  }
  const rounded = Math.round(amount);
  if (c.stats.wealth < rounded) return { log: ["Not enough wealth to gift."], success: false };
  c.stats.wealth = clamp(c.stats.wealth - rounded, 0, 999);
  c.family.spouseBond = clamp((c.family.spouseBond ?? 50) + Math.round(rounded / 10));
  return { log: [`Gifted ${rounded} wealth to ${c.family.spouseName}, strengthening their bond.`], success: true };
}
