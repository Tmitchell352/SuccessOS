import { randomUUID } from "node:crypto";
import type { Character, Dynasty, TreeRecord } from "@dynasty/shared";
import { COURT_FACTIONS, EPOCH_BY_ID } from "@dynasty/shared";

const FIRST_NAMES = ["Amara", "Tobias", "Isolde", "Kaelen", "Mirena", "Corwin", "Anwen", "Dashiell", "Yeva", "Renard"];
const LAST_SEEDS = ["Ashford", "Vale", "Rourke", "Sten", "Marek", "Oshiro", "Windham", "Calder", "Brenner", "Solis"];

export function randomName(): string {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_SEEDS[Math.floor(Math.random() * LAST_SEEDS.length)];
  return `${f} ${l}`;
}

function pickClass(epochId: string): string {
  const epoch = EPOCH_BY_ID[epochId];
  const total = epoch.classes.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * total;
  for (const c of epoch.classes) {
    roll -= c.weight;
    if (roll <= 0) return c.id;
  }
  return epoch.classes[0].id;
}

export function newDynasty(motto: string, difficulty: Dynasty["difficulty"], tone: Dynasty["tone"]): Dynasty {
  return {
    people: {},
    firedMilestones: [],
    currentId: null,
    worldRelations: {},
    legacyPoints: 0,
    legacyRival: null,
    familySeat: false,
    reputationBonus: 0,
    difficulty,
    tone,
    almanac: [],
    rivalHouse: null,
    motto,
    crestEmoji: "\u{1F3F0}",
    crestColor: "#8b5e34",
    biographies: {},
    eventTicker: [],
    victoryGoal: "none",
    victoryAchieved: false,
    greatWorks: [],
    nationPower: 50,
    activeCrisis: null,
    dynastyAchievements: [],
    everUnlockedAchievements: [],
    properties: [],
    tradition: "none",
    conqueredNations: [],
    noAiMode: false,
    chronicleText: null,
  };
}

export function newFoundingCharacter(epochId: string, nation: string, name?: string): Character {
  const epoch = EPOCH_BY_ID[epochId];
  if (!epoch) throw new Error(`Unknown epoch ${epochId}`);
  if (!epoch.nations.includes(nation)) throw new Error(`${nation} is not playable in ${epochId}`);

  const factionStanding = Object.fromEntries(COURT_FACTIONS.map((f) => [f, 50])) as Character["factionStanding"];

  return {
    id: randomUUID(),
    name: name?.trim() || randomName(),
    epochId,
    nation,
    classId: pickClass(epochId),
    trackId: null,
    trackTier: 0,
    age: 5,
    year: epoch.year,
    stats: { influence: 10, skill: 10, wealth: 20, health: 90, popularity: 20 },
    relations: {},
    family: { status: "single", children: [] },
    domestic: {},
    siblings: [],
    traits: [],
    specializations: {},
    conditions: [],
    imprisoned: null,
    willStyle: "default",
    properties: [],
    debt: null,
    possessions: [],
    achievements: [],
    wartime: false,
    retired: false,
    log: [{ age: 5, year: epoch.year, text: `Born into a ${nation} family.` }],
    heat: 0,
    followers: 0,
    eliteStanding: 50,
    sportsRivalWins: 0,
    sportsRivalLosses: 0,
    convertedFaith: null,
    factionStanding,
    alive: true,
    _erasWitnessed: [epochId],
    _traditionAppliedTracks: [],
    _hadDebt: false,
    _sentVenture: false,
    _wasDestitute: false,
    _survivedCrisis: false,
  };
}

export function toTreeRecord(c: Character, parentId: string | null, generation: number): TreeRecord {
  return {
    id: c.id,
    name: c.name,
    parentId,
    generation,
    birthYear: c.year - c.age,
    deathYear: c.alive ? null : c.year,
    nation: c.nation,
    classId: c.classId,
    epochId: c.epochId,
    peakTitle: null,
    traits: c.traits,
    giftedWealth: 0,
    parenting: [],
  };
}
