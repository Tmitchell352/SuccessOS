// Core data model, ported from docs/DYNASTY_HANDOFF.md Section 2.
// This file is the single source of truth for the Character/Dynasty/TreeRecord
// shapes. Both server and client import from here — never redeclare these
// shapes locally, that duplication is exactly how the original project's
// persistence bugs (Section 10) happened.

export type Stats = {
  influence: number; // 0-100
  skill: number; // 0-100
  wealth: number; // 0-999
  health: number; // 0-100
  popularity: number; // 0-100
};

export type WillStyle = "default" | "equal" | "eldestFavored" | "youngestFavored";

export type Difficulty = "gentle" | "standard" | "ruthless";
export type Tone = "balanced" | "gritty" | "witty" | "romantic";
export type Tradition = "none" | "military" | "scholarly" | "mercantile" | "political" | "devout";
export type VictoryGoal = "none" | "gen10" | "legacy300" | "legacy750";

export type Child = {
  name: string;
  age: number;
  traits: string[];
  giftedWealth: number;
  parenting: string[];
};

export type Family = {
  status: "single" | "married";
  spouseName?: string;
  spouseAge?: number;
  spouseBond?: number;
  children: Child[];
};

export type Domestic = {
  mentorName?: string;
  mentorTrust?: number;
  mentorAge?: number;
  rivalName?: string;
  rivalTension?: number;
  rivalAge?: number;
  friendName?: string;
  friendBond?: number;
  friendAge?: number;
};

export type Sibling = { name: string; age: number };

export type Property = { id: string; typeId: string; name: string; boughtYear: number };

export type Debt = { principal: number };

export type Imprisonment = { reason: string; yearsRemaining: number };

export type LogEntry = { age: number; year: number; text: string };

// A branching historical milestone (Section 6's last bullet) that's fired
// but not yet resolved - the turn engine stops advancing until the player
// picks a choice. Not itemized in the handoff doc's illustrative literal,
// same rationale as trackTier: needed to make the mechanic real.
export type PendingMilestone = {
  id: string;
  label: string;
  description: string;
  choices: { id: string; label: string; description: string }[];
};

export const COURT_FACTIONS = ["The Old Guard", "The Reformers", "The War Party"] as const;
export type CourtFaction = (typeof COURT_FACTIONS)[number];

export type Character = {
  id: string;
  name: string;
  epochId: string;
  nation: string;
  classId: string;
  trackId: string | null;
  // Not itemized in the handoff doc's illustrative Character literal (Section
  // 2), but needed to track title-ladder progress within a track - added
  // here rather than left implicit.
  trackTier: number; // 0-3, index into TrackDef.titles
  age: number;
  year: number;
  stats: Stats;
  relations: Record<string, number>;
  family: Family;
  domestic: Domestic;
  siblings: Sibling[];
  traits: string[];
  homeRegion?: string;
  specializations: Record<string, string>;
  conditions: string[];
  imprisoned: Imprisonment | null;
  willStyle: WillStyle;
  properties: Property[];
  debt: Debt | null;
  advisorName?: string;
  scenarioNote?: string;
  possessions: string[];
  achievements: string[];
  wartime: boolean;
  retired: boolean;
  log: LogEntry[];
  protegeName?: string;
  protegeAge?: number;
  protegeBond?: number;
  heat: number;
  followers: number;
  eliteStanding: number;
  sportsRivalName?: string;
  sportsRivalWins: number;
  sportsRivalLosses: number;
  convertedFaith: string | null;
  factionStanding: Record<CourtFaction, number>;
  alive: boolean;
  deathCause?: string;
  pendingMilestone?: PendingMilestone | null;

  // internal achievement/tracking flags
  _erasWitnessed: string[];
  _traditionAppliedTracks: string[];
  _hadDebt: boolean;
  _sentVenture: boolean;
  _wasDestitute: boolean;
  _survivedCrisis: boolean;
};

export type TreeRecord = {
  id: string;
  name: string;
  parentId: string | null;
  generation: number;
  birthYear: number;
  deathYear: number | null;
  nation: string;
  classId: string;
  epochId: string;
  peakTitle: string | null;
  traits: string[];
  giftedWealth: number;
  parenting: string[];
  // set at death:
  cause?: string;
  age?: number;
  peakInfluence?: number;
  peakWealth?: number;
  peakSkill?: number;
  peakPopularity?: number;
  achievementCount?: number;
  heldThrone?: boolean;
  possessions?: string[];
  willStyle?: WillStyle;
  properties?: Property[];
};

export type ActiveCrisis = {
  id: string;
  label: string;
  yearsRemaining: number;
  yearlyDelta: number;
};

export type ConqueredNation = {
  nation: string;
  mode: "absorbed" | "destroyed";
  year: number;
  integration: number;
};

export type GreatWork = { name: string; type: string; commissionedBy: string; year: number };

export type EventTickerEntry = { year: number; text: string };

export type RivalHouse = { name: string; score: number; relation: number };

export type LegacyRival = { name: string; tension: number };

export type Dynasty = {
  people: Record<string, TreeRecord>;
  firedMilestones: string[];
  currentId: string | null;
  worldRelations: Record<string, number>;
  legacyPoints: number;
  legacyRival: LegacyRival | null;
  familySeat: boolean;
  reputationBonus: number;
  difficulty: Difficulty;
  tone: Tone;
  almanac: string[];
  rivalHouse: RivalHouse | null;
  motto: string;
  crestEmoji: string;
  crestColor: string;
  biographies: Record<string, string>;
  eventTicker: EventTickerEntry[]; // capped at 150 entries
  victoryGoal: VictoryGoal;
  victoryAchieved: boolean;
  greatWorks: GreatWork[];
  nationPower: number; // 0-100
  activeCrisis: ActiveCrisis | null;
  dynastyAchievements: string[];
  everUnlockedAchievements: string[];
  properties: Property[];
  tradition: Tradition;
  conqueredNations: ConqueredNation[];
  noAiMode: boolean;
  chronicleText: string | null;
};

// A save slot wraps a Dynasty with the metadata the DB row needs.
export type DynastySave = {
  slotIndex: number;
  name: string;
  dynasty: Dynasty;
  character: Character | null; // the live in-progress character, if between-death
  updatedAt: string;
};
