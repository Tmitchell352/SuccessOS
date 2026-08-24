import type { WillStyle } from "./types.js";

// Inheritance friction (Section 7, driven by Section 8's willStyle field): a
// real cut taken from a deceased character's wealth before it transfers to
// the heir - 22% with no planning, down to 8% with both a written will and
// a family seat. Shared so the server (which applies it) and the client
// (which now previews it on GameOverScreen before the player commits to an
// heir) can never drift apart on the numbers.
export function computeInheritanceFriction(willStyle: WillStyle, familySeat: boolean): number {
  let friction = 0.22;
  if (willStyle !== "default") friction -= 0.08;
  if (familySeat) friction -= 0.06;
  return Math.max(0.08, Math.min(0.22, friction));
}

// Property tiers, per docs/DYNASTY_HANDOFF.md Section 7: "6 tiers
// (smallHouse -> grandEstate), one-time purchase cost + one-time bonus +
// recurring yearly income."

export type PropertyTier = {
  id: string;
  label: string;
  cost: number;
  yearlyIncome: number;
  bonus: Partial<Record<"influence" | "skill" | "popularity" | "health", number>>;
};

export const PROPERTY_TIERS: PropertyTier[] = [
  { id: "cottage", label: "Cottage", cost: 30, yearlyIncome: 2, bonus: { health: 2 } },
  { id: "smallHouse", label: "Small House", cost: 60, yearlyIncome: 4, bonus: { influence: 1 } },
  { id: "townhouse", label: "Townhouse", cost: 120, yearlyIncome: 8, bonus: { popularity: 2 } },
  { id: "estate", label: "Estate", cost: 220, yearlyIncome: 14, bonus: { influence: 3 } },
  { id: "manor", label: "Manor", cost: 380, yearlyIncome: 24, bonus: { influence: 5, popularity: 3 } },
  { id: "grandEstate", label: "Grand Estate", cost: 650, yearlyIncome: 40, bonus: { influence: 8, popularity: 5 } },
];

export const PROPERTY_TIER_BY_ID: Record<string, PropertyTier> = Object.fromEntries(PROPERTY_TIERS.map((t) => [t.id, t]));
