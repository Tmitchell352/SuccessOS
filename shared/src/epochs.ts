// Epoch/nation dataset, ported from docs/DYNASTY_HANDOFF.md Section 4.
//
// STATUS: all 20 epochs are present with correct id/year/label/currency
// (Section 4's table). Nation counts here are a starter subset per epoch,
// NOT the original's full 111-nation roster - the original dynasty.jsx
// source was not available to port from (see docs/DYNASTY_HANDOFF.md,
// "Status of this rebuild"). Expand `nations` per epoch and
// NATION_CONTINENT below to grow toward that target; the shape is already
// correct so this is pure data entry, no engine changes needed.

import { TrackSetId } from "./tracks.js";

export type SocialClass = { id: string; label: string; weight: number };
export type NpcDef = { name: string; title: string };

export type Epoch = {
  id: string;
  year: number;
  label: string;
  currency: string;
  trackSet: TrackSetId;
  classes: SocialClass[];
  nations: string[];
  npcs: Record<string, NpcDef>;
  worldEvents: string[];
};

const DEFAULT_CLASSES: SocialClass[] = [
  { id: "commoner", label: "Commoner", weight: 60 },
  { id: "artisanFamily", label: "Artisan Family", weight: 20 },
  { id: "merchant", label: "Merchant Family", weight: 12 },
  { id: "noble", label: "Noble", weight: 8 },
];

export const EPOCHS: Epoch[] = [
  {
    id: "earlyBronze", year: -3000, label: "Early Bronze Age", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Sumer", "Egypt", "Elam"],
    npcs: {
      Sumer: { name: "Enheduanna", title: "High Priestess" },
      Egypt: { name: "Narmer", title: "Unifier of the Two Lands" },
      Elam: { name: "Tata", title: "King of Susa" },
    },
    worldEvents: ["The river floods bring a rich harvest.", "A dispute over grazing rights unsettles the region."],
  },
  {
    id: "middleBronze", year: -2000, label: "Middle Bronze Age", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Babylon", "Egypt", "Assyria"],
    npcs: {
      Babylon: { name: "Sin-Muballit", title: "King" },
      Egypt: { name: "Amenemhat", title: "Pharaoh" },
      Assyria: { name: "Erishum", title: "Ruler of Ashur" },
    },
    worldEvents: ["Trade caravans bring news from distant cities.", "A border skirmish disrupts local trade."],
  },
  {
    id: "lateBronze", year: -1400, label: "Late Bronze Age", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Egypt", "Hittites", "Mycenae"],
    npcs: {
      Egypt: { name: "Amenhotep", title: "Pharaoh" },
      Hittites: { name: "Suppiluliuma", title: "Great King" },
      Mycenae: { name: "Atreus", title: "Wanax" },
    },
    worldEvents: ["A diplomatic marriage is proposed between royal houses.", "Sea traders report unrest along the coast."],
  },
  {
    id: "ironAge", year: -900, label: "Iron Age Empires", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Assyria", "Israel", "Phoenicia"],
    npcs: {
      Assyria: { name: "Shalmaneser", title: "King of Kings" },
      Israel: { name: "Jeroboam", title: "King" },
      Phoenicia: { name: "Hiram", title: "King of Tyre" },
    },
    worldEvents: ["Iron tools spread through the marketplace.", "A tribute demand arrives from a stronger neighbor."],
  },
  {
    id: "classical", year: -500, label: "Classical Antiquity", currency: "drachmas", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Athens", "Sparta", "Persia"],
    npcs: {
      Athens: { name: "Themistocles", title: "Strategos" },
      Sparta: { name: "Leonidas", title: "King" },
      Persia: { name: "Darius", title: "Shahanshah" },
    },
    worldEvents: ["The assembly debates a new law.", "Word arrives of a Persian fleet massing."],
  },
  {
    id: "hellenistic", year: -300, label: "Hellenistic Age", currency: "drachmas", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Macedon", "Ptolemaic Egypt", "Seleucid Empire"],
    npcs: {
      Macedon: { name: "Antigonus", title: "King" },
      "Ptolemaic Egypt": { name: "Ptolemy", title: "Pharaoh" },
      "Seleucid Empire": { name: "Seleucus", title: "Basileus" },
    },
    worldEvents: ["Scholars gather at the great library.", "Succession disputes trouble a neighboring kingdom."],
  },
  {
    id: "hanChina", year: -200, label: "Classical East Asia", currency: "cash coins", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Han China", "Xiongnu Confederation", "Korea"],
    npcs: {
      "Han China": { name: "Emperor Wu", title: "Son of Heaven" },
      "Xiongnu Confederation": { name: "Modu", title: "Chanyu" },
      Korea: { name: "Dongmyeong", title: "King" },
    },
    worldEvents: ["The Silk Road brings unfamiliar goods to market.", "Nomadic raiders are sighted near the frontier."],
  },
  {
    id: "rome", year: -250, label: "Ancient Rome", currency: "denarii", trackSet: "rome",
    classes: DEFAULT_CLASSES,
    nations: ["Rome", "Carthage", "Gaul"],
    npcs: {
      Rome: { name: "Fabius", title: "Consul" },
      Carthage: { name: "Hamilcar", title: "Suffet" },
      Gaul: { name: "Brennus", title: "Chieftain" },
    },
    worldEvents: ["The Senate convenes to debate a foreign war.", "A gladiatorial spectacle is announced."],
  },
  {
    id: "lateAntiquity", year: 400, label: "Late Antiquity", currency: "solidi", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Byzantium", "Visigothic Kingdom", "Sassanid Persia"],
    npcs: {
      Byzantium: { name: "Theodosius", title: "Emperor" },
      "Visigothic Kingdom": { name: "Alaric", title: "King" },
      "Sassanid Persia": { name: "Shapur", title: "Shahanshah" },
    },
    worldEvents: ["Refugees stream in from the frontier provinces.", "A church council debates matters of doctrine."],
  },
  {
    id: "earlyMedieval", year: 700, label: "Early Medieval", currency: "silver pennies", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Francia", "Umayyad Caliphate", "Anglo-Saxon England"],
    npcs: {
      Francia: { name: "Pepin", title: "Mayor of the Palace" },
      "Umayyad Caliphate": { name: "Al-Walid", title: "Caliph" },
      "Anglo-Saxon England": { name: "Ine", title: "King of Wessex" },
    },
    worldEvents: ["A monastery scriptorium seeks new copyists.", "Raiders are sighted along the coast."],
  },
  {
    id: "highMedieval", year: 1200, label: "High Medieval", currency: "silver pennies", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["England", "France", "Holy Roman Empire"],
    npcs: {
      England: { name: "John", title: "King" },
      France: { name: "Philip Augustus", title: "King" },
      "Holy Roman Empire": { name: "Otto", title: "Emperor" },
    },
    worldEvents: ["A cathedral's construction draws craftsmen from afar.", "The barons murmur of a new charter of rights."],
  },
  {
    id: "preColumbianAmericas", year: 1300, label: "Pre-Columbian Americas", currency: "cacao beans", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Aztec Triple Alliance", "Kingdom of Cusco", "Mississippian Cahokia"],
    npcs: {
      "Aztec Triple Alliance": { name: "Acamapichtli", title: "Tlatoani" },
      "Kingdom of Cusco": { name: "Sinchi Roca", title: "Sapa Inca" },
      "Mississippian Cahokia": { name: "Corn Chief", title: "Paramount Chief" },
    },
    worldEvents: ["Tribute bearers arrive from a subject town.", "The priests announce an auspicious date on the calendar."],
  },
  {
    id: "subSaharanAfrica", year: 1350, label: "West & Southern African Kingdoms", currency: "gold dust", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Mali Empire", "Kingdom of Kongo", "Great Zimbabwe"],
    npcs: {
      "Mali Empire": { name: "Mansa Musa", title: "Mansa" },
      "Kingdom of Kongo": { name: "Nimi a Lukeni", title: "Manikongo" },
      "Great Zimbabwe": { name: "Nyatsimba", title: "Mambo" },
    },
    worldEvents: ["A gold caravan departs for the northern markets.", "Griots recount the deeds of the ruling house."],
  },
  {
    id: "renaissance", year: 1500, label: "Renaissance & Exploration", currency: "ducats", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["Florence", "Portugal", "Ottoman Empire"],
    npcs: {
      Florence: { name: "Lorenzo", title: "Signore" },
      Portugal: { name: "Manuel", title: "King" },
      "Ottoman Empire": { name: "Bayezid", title: "Sultan" },
    },
    worldEvents: ["A workshop unveils a startling new technique.", "Ships return from a voyage with unfamiliar cargo."],
  },
  {
    id: "colonialAmericas", year: 1630, label: "Colonial Americas", currency: "pieces of eight", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["New Spain", "New England", "New France"],
    npcs: {
      "New Spain": { name: "Diego", title: "Viceroy" },
      "New England": { name: "Winthrop", title: "Governor" },
      "New France": { name: "Champlain", title: "Governor" },
    },
    worldEvents: ["A ship arrives from the old country with new settlers.", "Tensions rise over disputed land claims."],
  },
  {
    id: "absolutism", year: 1650, label: "Age of Absolutism", currency: "livres", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["France", "Spain", "Sweden"],
    npcs: {
      France: { name: "Louis", title: "King" },
      Spain: { name: "Philip", title: "King" },
      Sweden: { name: "Christina", title: "Queen" },
    },
    worldEvents: ["The court gossips about a new royal favorite.", "War taxes stir grumbling in the provinces."],
  },
  {
    id: "enlightenment", year: 1750, label: "Enlightenment & Empire", currency: "pounds sterling", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["Great Britain", "Prussia", "Qing China"],
    npcs: {
      "Great Britain": { name: "Pitt", title: "Prime Minister" },
      Prussia: { name: "Frederick", title: "King" },
      "Qing China": { name: "Qianlong", title: "Emperor" },
    },
    worldEvents: ["A pamphlet debating natural rights circulates in coffeehouses.", "A trading company reports a windfall from the colonies."],
  },
  {
    id: "europe1897", year: 1897, label: "Europe, Age of Empires", currency: "pounds sterling", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["Britain", "German Empire", "Austria-Hungary"],
    npcs: {
      Britain: { name: "Salisbury", title: "Prime Minister" },
      "German Empire": { name: "Wilhelm", title: "Kaiser" },
      "Austria-Hungary": { name: "Franz Joseph", title: "Emperor" },
    },
    worldEvents: ["A new rail line opens to great fanfare.", "Naval rivalry dominates the newspapers."],
  },
  {
    id: "coldWar", year: 1950, label: "Cold War Era", currency: "dollars", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["United States", "Soviet Union", "United Kingdom"],
    npcs: {
      "United States": { name: "Eisenhower", title: "President" },
      "Soviet Union": { name: "Khrushchev", title: "First Secretary" },
      "United Kingdom": { name: "Churchill", title: "Prime Minister" },
    },
    worldEvents: ["A satellite launch dominates the news.", "Diplomats trade tense words at a summit."],
  },
  {
    id: "contemporary", year: 2000, label: "Contemporary World", currency: "dollars", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["United States", "Japan", "Germany"],
    npcs: {
      "United States": { name: "The President", title: "President" },
      Japan: { name: "The Prime Minister", title: "Prime Minister" },
      Germany: { name: "The Chancellor", title: "Chancellor" },
    },
    worldEvents: ["A tech startup makes headlines with a new product.", "Markets react to an unexpected policy announcement."],
  },
];

export const EPOCH_BY_ID: Record<string, Epoch> = Object.fromEntries(EPOCHS.map((e) => [e.id, e]));

export function nearestEpoch(year: number): Epoch {
  let best = EPOCHS[0];
  let bestDist = Infinity;
  for (const e of EPOCHS) {
    const d = Math.abs(e.year - year);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

// Standalone continent lookup (Section 4), independent of epoch data so
// nations can be browsed continent-first. Only covers the starter nation
// set above - extend alongside `nations` arrays as the roster grows.
export const NATION_CONTINENT: Record<string, "Africa" | "The Americas" | "Asia" | "Europe"> = {
  Sumer: "Asia", Egypt: "Africa", Elam: "Asia",
  Babylon: "Asia", Assyria: "Asia",
  Hittites: "Asia", Mycenae: "Europe",
  Israel: "Asia", Phoenicia: "Asia",
  Athens: "Europe", Sparta: "Europe", Persia: "Asia",
  Macedon: "Europe", "Ptolemaic Egypt": "Africa", "Seleucid Empire": "Asia",
  "Han China": "Asia", "Xiongnu Confederation": "Asia", Korea: "Asia",
  Rome: "Europe", Carthage: "Africa", Gaul: "Europe",
  Byzantium: "Europe", "Visigothic Kingdom": "Europe", "Sassanid Persia": "Asia",
  Francia: "Europe", "Umayyad Caliphate": "Asia", "Anglo-Saxon England": "Europe",
  England: "Europe", France: "Europe", "Holy Roman Empire": "Europe",
  "Aztec Triple Alliance": "The Americas", "Kingdom of Cusco": "The Americas", "Mississippian Cahokia": "The Americas",
  "Mali Empire": "Africa", "Kingdom of Kongo": "Africa", "Great Zimbabwe": "Africa",
  Florence: "Europe", Portugal: "Europe", "Ottoman Empire": "Asia",
  "New Spain": "The Americas", "New England": "The Americas", "New France": "The Americas",
  Spain: "Europe", Sweden: "Europe",
  "Great Britain": "Europe", Prussia: "Europe", "Qing China": "Asia",
  Britain: "Europe", "German Empire": "Europe", "Austria-Hungary": "Europe",
  "United States": "The Americas", "Soviet Union": "Europe", "United Kingdom": "Europe",
  Japan: "Asia", Germany: "Europe",
};
