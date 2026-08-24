// Achievement metadata (Section 1's "dynastyAchievements"/"Codex screen").
// Predicates live server-side (server/src/game/engine/achievements.ts) -
// this file is display metadata only, shared so the client's Codex screen
// can render id -> label/description without duplicating the list.

export type AchievementDef = { id: string; label: string; description: string; hidden: boolean };

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "masterOfTheCraft", label: "Master of the Craft", description: "Reach the top tier of any career track.", hidden: false },
  { id: "ascendTheThrone", label: "Ascend the Throne", description: "Become the nation's ruler.", hidden: false },
  { id: "firstConquest", label: "First Conquest", description: "Absorb or destroy a rival nation.", hidden: false },
  { id: "empireBuilder", label: "Empire Builder", description: "Bring three or more nations under the dynasty's control.", hidden: false },
  { id: "fabulouslyWealthy", label: "Fabulously Wealthy", description: "Reach 900 wealth.", hidden: false },
  { id: "ragsToRiches", label: "Rags to Riches", description: "Recover from destitution.", hidden: true },
  { id: "prolificParent", label: "Prolific Parent", description: "Have five or more children.", hidden: false },
  { id: "aLongLife", label: "A Long Life", description: "Live to see 90.", hidden: false },
  { id: "battleScarred", label: "Battle-Scarred Survivor", description: "Survive being wounded in battle.", hidden: true },
  { id: "prolificScholar", label: "Prolific Scholar", description: "Publish five or more treatises.", hidden: false },
  { id: "belovedProphet", label: "Beloved Prophet", description: "Gather 150 or more followers.", hidden: false },
  { id: "crimeLord", label: "Crime Lord", description: "Reach the top of the criminal underworld.", hidden: false },
  { id: "witnessToHistory", label: "Witness to History", description: "Live through three or more historical epochs.", hidden: false },
  { id: "livingThroughHistory", label: "Living Through History", description: "Witness ten or more fixed historical milestones as a dynasty.", hidden: false },
  { id: "weatheredTheStorm", label: "Weathered the Storm", description: "Survive a crisis to its end.", hidden: true },
  { id: "calculatedRisk", label: "Calculated Risk", description: "Stake wealth on a risky venture.", hidden: true },
  { id: "generationalLegacy", label: "Generational Legacy", description: "Reach the 10th generation of the dynasty.", hidden: false },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENT_DEFS.map((a) => [a.id, a]));
