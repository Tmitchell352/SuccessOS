// Career track definitions, ported from docs/DYNASTY_HANDOFF.md Section 5.
//
// All 10 tracks share a 4-tier title ladder + salary scaling + one-time
// specializations (Section 5, "All tracks share..."). Per-epoch flavor is
// handled by picking one of these era-appropriate dictionaries rather than
// authoring titles per-epoch (matches the original's 4 shared dictionaries:
// GENERIC_TRACKS, EARLY_MODERN_TRACKS, MODERN_TRACKS, plus Rome's bespoke set).
//
// STATUS: title ladders + base salaries are filled in for all 10 tracks in
// all 4 dictionaries. The *distinct mechanics* described in Section 5's table
// (heat meter, followers, campaigns, etc.) are only implemented in the engine
// for Political, Military, and Commercial so far - see
// server/src/game/engine/tracks.ts. The rest fall back to the generic
// "career progression" mechanic (title/salary only) until built out.

export const TRACK_IDS = [
  "political",
  "military",
  "religious",
  "criminal",
  "academic",
  "commercial",
  "medical",
  "maritime",
  "artisan",
  "sports",
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export type Specialization = { id: string; label: string; statBonus: Partial<Record<"influence" | "skill" | "wealth" | "health" | "popularity", number>> };

export type TrackDef = {
  id: TrackId;
  label: string;
  // 4-tier title ladder. `null` at the top tier means "fall back to the
  // nation's real top title" (Political's route to becoming the ruler).
  titles: [string, string, string, string | null];
  baseSalary: number;
  retireAge: number;
  specializations: Specialization[];
};

export type TrackSet = Record<TrackId, TrackDef>;

function spec(id: string, label: string, statBonus: Specialization["statBonus"]): Specialization {
  return { id, label, statBonus };
}

export const GENERIC_TRACKS: TrackSet = {
  political: {
    id: "political",
    label: "Politics",
    titles: ["Council Petitioner", "Magistrate", "High Minister", null],
    baseSalary: 20,
    retireAge: 65,
    specializations: [
      spec("orator", "Orator", { influence: 8 }),
      spec("strategist", "Strategist", { skill: 6, influence: 4 }),
      spec("patron", "Patron of the People", { popularity: 8 }),
    ],
  },
  military: {
    id: "military",
    label: "Military",
    titles: ["Levy Soldier", "Captain", "Commander", "Warlord"],
    baseSalary: 16,
    retireAge: 55,
    specializations: [
      spec("infantry", "Infantry Tactics", { skill: 6, health: 4 }),
      spec("cavalry", "Cavalry", { skill: 8 }),
      spec("siegecraft", "Siegecraft", { skill: 6, influence: 4 }),
    ],
  },
  religious: {
    id: "religious",
    label: "Religious",
    titles: ["Acolyte", "Priest", "High Priest", "Oracle"],
    baseSalary: 12,
    retireAge: 70,
    specializations: [
      spec("preacher", "Preacher", { popularity: 8 }),
      spec("scholar-priest", "Scriptural Scholar", { skill: 6, influence: 4 }),
      spec("healer-priest", "Healing Rites", { health: 6, popularity: 4 }),
    ],
  },
  criminal: {
    id: "criminal",
    label: "Criminal",
    titles: ["Petty Thief", "Smuggler", "Crime Boss", "Shadow Lord"],
    baseSalary: 18,
    retireAge: 50,
    specializations: [
      spec("thief", "Cutpurse", { wealth: 8 }),
      spec("enforcer", "Enforcer", { skill: 6, health: 4 }),
      spec("fixer", "Fixer", { influence: 6, wealth: 4 }),
    ],
  },
  academic: {
    id: "academic",
    label: "Academic",
    titles: ["Student", "Scribe", "Scholar", "Sage"],
    baseSalary: 10,
    retireAge: 70,
    specializations: [
      spec("historian", "Historian", { influence: 6 }),
      spec("mathematician", "Mathematician", { skill: 8 }),
      spec("philosopher", "Philosopher", { influence: 4, popularity: 4 }),
    ],
  },
  commercial: {
    id: "commercial",
    label: "Commercial",
    titles: ["Peddler", "Trader", "Merchant Prince", "Guild Master"],
    baseSalary: 22,
    retireAge: 60,
    specializations: [
      spec("negotiator", "Negotiator", { wealth: 6, influence: 4 }),
      spec("caravan-master", "Caravan Master", { wealth: 8 }),
      spec("financier", "Financier", { wealth: 6, skill: 4 }),
    ],
  },
  medical: {
    id: "medical",
    label: "Medical",
    titles: ["Herbalist's Apprentice", "Healer", "Physician", "Master Physician"],
    baseSalary: 14,
    retireAge: 65,
    specializations: [
      spec("surgeon", "Surgeon", { skill: 8 }),
      spec("herbalist", "Herbalist", { health: 6, skill: 4 }),
      spec("bedside", "Bedside Manner", { popularity: 6, health: 4 }),
    ],
  },
  maritime: {
    id: "maritime",
    label: "Maritime",
    titles: ["Deckhand", "Navigator", "Ship's Captain", "Fleet Admiral"],
    baseSalary: 16,
    retireAge: 55,
    specializations: [
      spec("navigator", "Navigation", { skill: 8 }),
      spec("trader-captain", "Trade Routes", { wealth: 6, skill: 4 }),
      spec("privateer", "Privateer", { influence: 6, wealth: 4 }),
    ],
  },
  artisan: {
    id: "artisan",
    label: "Artisan",
    titles: ["Apprentice", "Journeyman", "Master Craftsman", "Legendary Artificer"],
    baseSalary: 12,
    retireAge: 65,
    specializations: [
      spec("sculptor", "Sculpture", { skill: 6, influence: 4 }),
      spec("smith", "Smithing", { skill: 8 }),
      spec("painter", "Painting", { popularity: 6, skill: 4 }),
    ],
  },
  sports: {
    id: "sports",
    label: "Sports",
    titles: ["Local Contender", "Regional Champion", "Renowned Athlete", "Legend of the Games"],
    baseSalary: 14,
    retireAge: 32,
    specializations: [
      spec("wrestler", "Wrestling", { skill: 6, health: 4 }),
      spec("racer", "Chariot/Foot Racing", { skill: 8 }),
      spec("crowd-favorite", "Crowd Favorite", { popularity: 8 }),
    ],
  },
};

export const EARLY_MODERN_TRACKS: TrackSet = {
  political: { ...GENERIC_TRACKS.political, titles: ["Petitioner", "Councilman", "Minister", null], baseSalary: 30 },
  military: { ...GENERIC_TRACKS.military, titles: ["Musketeer", "Lieutenant", "Colonel", "General"], baseSalary: 24 },
  religious: { ...GENERIC_TRACKS.religious, titles: ["Novice", "Pastor", "Bishop", "Cardinal"], baseSalary: 18 },
  criminal: { ...GENERIC_TRACKS.criminal, titles: ["Pickpocket", "Smuggler", "Crime Lord", "Kingpin"], baseSalary: 26 },
  academic: { ...GENERIC_TRACKS.academic, titles: ["Student", "Tutor", "Professor", "Renowned Scholar"], baseSalary: 16 },
  commercial: { ...GENERIC_TRACKS.commercial, titles: ["Clerk", "Merchant", "Trading Magnate", "Company Director"], baseSalary: 32 },
  medical: { ...GENERIC_TRACKS.medical, titles: ["Barber-Surgeon's Aide", "Physician", "Court Physician", "Renowned Doctor"], baseSalary: 20 },
  maritime: { ...GENERIC_TRACKS.maritime, titles: ["Deckhand", "First Mate", "Ship's Captain", "Admiral"], baseSalary: 24 },
  artisan: { ...GENERIC_TRACKS.artisan, titles: ["Apprentice", "Journeyman", "Guild Master", "Renowned Master"], baseSalary: 18 },
  sports: { ...GENERIC_TRACKS.sports, titles: ["Local Talent", "Champion", "National Hero", "Legend"], baseSalary: 18 },
};

export const MODERN_TRACKS: TrackSet = {
  political: { ...GENERIC_TRACKS.political, titles: ["Campaign Staffer", "Councilmember", "Cabinet Minister", null], baseSalary: 40 },
  military: { ...GENERIC_TRACKS.military, titles: ["Private", "Captain", "Colonel", "General"], baseSalary: 32 },
  religious: { ...GENERIC_TRACKS.religious, titles: ["Seminarian", "Pastor", "Bishop", "Archbishop"], baseSalary: 24 },
  criminal: { ...GENERIC_TRACKS.criminal, titles: ["Street Hustler", "Fixer", "Crime Boss", "Syndicate Head"], baseSalary: 34 },
  academic: { ...GENERIC_TRACKS.academic, titles: ["Grad Student", "Lecturer", "Professor", "Nobel-Caliber Researcher"], baseSalary: 22 },
  commercial: { ...GENERIC_TRACKS.commercial, titles: ["Sales Associate", "Manager", "Executive", "CEO"], baseSalary: 42 },
  medical: { ...GENERIC_TRACKS.medical, titles: ["Med Student", "Doctor", "Chief of Medicine", "World-Renowned Surgeon"], baseSalary: 30 },
  maritime: { ...GENERIC_TRACKS.maritime, titles: ["Deckhand", "First Officer", "Captain", "Fleet Commodore"], baseSalary: 28 },
  artisan: { ...GENERIC_TRACKS.artisan, titles: ["Apprentice", "Designer", "Master Craftsperson", "Renowned Artist"], baseSalary: 22 },
  sports: { ...GENERIC_TRACKS.sports, titles: ["Amateur", "Pro Athlete", "All-Star", "Hall of Famer"], baseSalary: 26 },
};

// Rome's bespoke set - kept genuinely separate per the original design note
// (Section 4: "bespoke tracks/classes, not shared dictionaries").
export const ROME_TRACKS: TrackSet = {
  political: { ...GENERIC_TRACKS.political, titles: ["Quaestor", "Aedile", "Praetor", null], baseSalary: 24 },
  military: { ...GENERIC_TRACKS.military, titles: ["Legionary", "Centurion", "Legate", "Imperator"], baseSalary: 20 },
  religious: { ...GENERIC_TRACKS.religious, titles: ["Temple Servant", "Priest", "Pontifex", "Pontifex Maximus"], baseSalary: 14 },
  criminal: { ...GENERIC_TRACKS.criminal, titles: ["Cutpurse", "Gang Leader", "Crime Patron", "Shadow Senator"], baseSalary: 20 },
  academic: { ...GENERIC_TRACKS.academic, titles: ["Grammaticus Student", "Rhetorician", "Philosopher", "Renowned Sage"], baseSalary: 12 },
  commercial: { ...GENERIC_TRACKS.commercial, titles: ["Vendor", "Merchant", "Trade Magnate", "Guild Patron"], baseSalary: 24 },
  medical: { ...GENERIC_TRACKS.medical, titles: ["Medicus Apprentice", "Medicus", "Army Surgeon", "Physician to the Senate"], baseSalary: 16 },
  maritime: { ...GENERIC_TRACKS.maritime, titles: ["Oarsman", "Navigator", "Trireme Captain", "Fleet Prefect"], baseSalary: 18 },
  artisan: { ...GENERIC_TRACKS.artisan, titles: ["Apprentice", "Craftsman", "Master Artisan", "Renowned Artificer"], baseSalary: 14 },
  sports: { ...GENERIC_TRACKS.sports, titles: ["Novice Gladiator", "Arena Fighter", "Champion Gladiator", "Legend of the Colosseum"], baseSalary: 16 },
};

export const TRACK_SETS = {
  generic: GENERIC_TRACKS,
  earlyModern: EARLY_MODERN_TRACKS,
  modern: MODERN_TRACKS,
  rome: ROME_TRACKS,
} as const;
export type TrackSetId = keyof typeof TRACK_SETS;
