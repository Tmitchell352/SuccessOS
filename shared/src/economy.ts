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
