// Epoch/nation dataset, ported from docs/DYNASTY_HANDOFF.md Section 4.
//
// STATUS: all 20 epochs are present with correct id/year/label/currency
// (Section 4's table), and nation counts now match that table's targets (9
// for the first 8 ancient epochs, 6 for the remaining 12) - this was
// expanded from an initial 3-per-epoch starter subset. The original
// dynasty.jsx source was never available to port the true 111-nation
// roster from (see docs/DYNASTY_HANDOFF.md, "Status of this rebuild"), so
// every nation added here was chosen independently: real, broadly
// period-appropriate historical polities (a few, where no historical ruler
// is attested - e.g. Indus Valley, Ancestral Puebloans - use a plausible
// invented name, same as the game does everywhere for flavor NPCs). Some
// nations recur across consecutive epochs under the same name with a
// different NPC, representing continuity (e.g. Egypt, Assyria); regionally
// -themed epochs (Pre-Columbian Americas, West & Southern African Kingdoms,
// Colonial Americas) draw only from their own region, matching the
// original's epoch design rather than forcing four-continent balance onto
// every epoch.

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
    nations: ["Sumer", "Egypt", "Elam", "Indus Valley", "Nubia", "Caral-Supe", "Cycladic Culture", "Megalithic Iberia", "Valdivia Culture"],
    npcs: {
      Sumer: { name: "Enheduanna", title: "High Priestess" },
      Egypt: { name: "Narmer", title: "Unifier of the Two Lands" },
      Elam: { name: "Tata", title: "King of Susa" },
      "Indus Valley": { name: "Dhruva", title: "Trade-Chief of Mohenjo-daro" },
      Nubia: { name: "Qustul", title: "Ruler of Ta-Seti" },
      "Caral-Supe": { name: "Aspero", title: "Sacred Lord of Caral" },
      "Cycladic Culture": { name: "Kastri", title: "Island Chieftain" },
      "Megalithic Iberia": { name: "Deva", title: "Chieftain of the Great Stones" },
      "Valdivia Culture": { name: "Punta", title: "Elder of the Coast" },
    },
    worldEvents: ["The river floods bring a rich harvest.", "A dispute over grazing rights unsettles the region."],
  },
  {
    id: "middleBronze", year: -2000, label: "Middle Bronze Age", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Babylon", "Egypt", "Assyria", "Indus Valley", "Kingdom of Kush", "Minoan Crete", "Unetice Culture", "Norte Chico", "Poverty Point Culture"],
    npcs: {
      Babylon: { name: "Sin-Muballit", title: "King" },
      Egypt: { name: "Amenemhat", title: "Pharaoh" },
      Assyria: { name: "Erishum", title: "Ruler of Ashur" },
      "Indus Valley": { name: "Sarasvati", title: "City Elder of Mohenjo-daro" },
      "Kingdom of Kush": { name: "Kerma", title: "King of Kush" },
      "Minoan Crete": { name: "Minos", title: "Priest-King of Knossos" },
      "Unetice Culture": { name: "Nebra", title: "Bronze Chieftain" },
      "Norte Chico": { name: "Supe", title: "Sacred Lord of Norte Chico" },
      "Poverty Point Culture": { name: "Macon", title: "Mound Elder" },
    },
    worldEvents: ["Trade caravans bring news from distant cities.", "A border skirmish disrupts local trade."],
  },
  {
    id: "lateBronze", year: -1400, label: "Late Bronze Age", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Egypt", "Hittites", "Mycenae", "Assyria", "Elam", "Kingdom of Kush", "Nuragic Sardinia", "Olmec Civilization", "Kotosh Tradition"],
    npcs: {
      Egypt: { name: "Amenhotep", title: "Pharaoh" },
      Hittites: { name: "Suppiluliuma", title: "Great King" },
      Mycenae: { name: "Atreus", title: "Wanax" },
      Assyria: { name: "Ashur-uballit", title: "King of Assyria" },
      Elam: { name: "Untash-Napirisha", title: "King of Elam" },
      "Kingdom of Kush": { name: "Alara", title: "King of Kush" },
      "Nuragic Sardinia": { name: "Nurra", title: "Nuraghe Chieftain" },
      "Olmec Civilization": { name: "Ek", title: "Olmec Lord" },
      "Kotosh Tradition": { name: "Kotosh", title: "Temple Elder" },
    },
    worldEvents: ["A diplomatic marriage is proposed between royal houses.", "Sea traders report unrest along the coast."],
  },
  {
    id: "ironAge", year: -900, label: "Iron Age Empires", currency: "shekels", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Assyria", "Israel", "Phoenicia", "Kingdom of Kush", "Nok Culture", "Etruria", "Hallstatt Celts", "Olmec Civilization", "Chavín Culture"],
    npcs: {
      Assyria: { name: "Shalmaneser", title: "King of Kings" },
      Israel: { name: "Jeroboam", title: "King" },
      Phoenicia: { name: "Hiram", title: "King of Tyre" },
      "Kingdom of Kush": { name: "Kashta", title: "King of Kush" },
      "Nok Culture": { name: "Nok", title: "Terracotta Elder" },
      Etruria: { name: "Tarchon", title: "Lucumo of Etruria" },
      "Hallstatt Celts": { name: "Vix", title: "Hallstatt Chieftain" },
      "Olmec Civilization": { name: "Xoc", title: "Olmec Ruler" },
      "Chavín Culture": { name: "Yauya", title: "Oracle Priest of Chavín" },
    },
    worldEvents: ["Iron tools spread through the marketplace.", "A tribute demand arrives from a stronger neighbor."],
  },
  {
    id: "classical", year: -500, label: "Classical Antiquity", currency: "drachmas", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Athens", "Sparta", "Persia", "Magadha", "Zhou Dynasty China", "Kingdom of Kush", "Carthage", "Zapotec Civilization", "Chavín Culture"],
    npcs: {
      Athens: { name: "Themistocles", title: "Strategos" },
      Sparta: { name: "Leonidas", title: "King" },
      Persia: { name: "Darius", title: "Shahanshah" },
      Magadha: { name: "Bimbisara", title: "King of Magadha" },
      "Zhou Dynasty China": { name: "King Jing", title: "Son of Heaven" },
      "Kingdom of Kush": { name: "Aspelta", title: "King of Kush" },
      Carthage: { name: "Mago", title: "Suffet of Carthage" },
      "Zapotec Civilization": { name: "Yagul", title: "Zapotec Lord" },
      "Chavín Culture": { name: "Huántar", title: "Oracle of Chavín" },
    },
    worldEvents: ["The assembly debates a new law.", "Word arrives of a Persian fleet massing."],
  },
  {
    id: "hellenistic", year: -300, label: "Hellenistic Age", currency: "drachmas", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Macedon", "Ptolemaic Egypt", "Seleucid Empire", "Mauryan Empire", "Qin Dynasty China", "Kingdom of Kush", "Roman Republic", "Zapotec Civilization", "Kingdom of El Mirador"],
    npcs: {
      Macedon: { name: "Antigonus", title: "King" },
      "Ptolemaic Egypt": { name: "Ptolemy", title: "Pharaoh" },
      "Seleucid Empire": { name: "Seleucus", title: "Basileus" },
      "Mauryan Empire": { name: "Chandragupta", title: "Samrat" },
      "Qin Dynasty China": { name: "Ying Zheng", title: "First Emperor" },
      "Kingdom of Kush": { name: "Arkamani", title: "King of Kush" },
      "Roman Republic": { name: "Appius Claudius", title: "Consul" },
      "Zapotec Civilization": { name: "Cocijo", title: "Zapotec Ruler" },
      "Kingdom of El Mirador": { name: "Siyaj", title: "Kaloomte' of El Mirador" },
    },
    worldEvents: ["Scholars gather at the great library.", "Succession disputes trouble a neighboring kingdom."],
  },
  {
    id: "hanChina", year: -200, label: "Classical East Asia", currency: "cash coins", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Han China", "Xiongnu Confederation", "Korea", "Kingdom of Kush", "Numidia", "Roman Republic", "Celtiberian Iberia", "Kingdom of El Mirador", "Salinar Culture"],
    npcs: {
      "Han China": { name: "Emperor Wu", title: "Son of Heaven" },
      "Xiongnu Confederation": { name: "Modu", title: "Chanyu" },
      Korea: { name: "Dongmyeong", title: "King" },
      "Kingdom of Kush": { name: "Arnekhamani", title: "King of Kush" },
      Numidia: { name: "Masinissa", title: "King of Numidia" },
      "Roman Republic": { name: "Scipio", title: "Consul" },
      "Celtiberian Iberia": { name: "Indibilis", title: "Celtiberian Chieftain" },
      "Kingdom of El Mirador": { name: "Siyaj", title: "Kaloomte' of El Mirador" },
      "Salinar Culture": { name: "Nepeña", title: "Coastal Lord" },
    },
    worldEvents: ["The Silk Road brings unfamiliar goods to market.", "Nomadic raiders are sighted near the frontier."],
  },
  {
    id: "rome", year: -250, label: "Ancient Rome", currency: "denarii", trackSet: "rome",
    classes: DEFAULT_CLASSES,
    nations: ["Rome", "Carthage", "Gaul", "Seleucid Empire", "Parthia", "Ptolemaic Egypt", "Epirus", "Olmec Civilization", "Chavín Culture"],
    npcs: {
      Rome: { name: "Fabius", title: "Consul" },
      Carthage: { name: "Hamilcar", title: "Suffet" },
      Gaul: { name: "Brennus", title: "Chieftain" },
      "Seleucid Empire": { name: "Antiochus", title: "Basileus" },
      Parthia: { name: "Arsaces", title: "King of Parthia" },
      "Ptolemaic Egypt": { name: "Ptolemy II", title: "Pharaoh" },
      Epirus: { name: "Pyrrhus", title: "King of Epirus" },
      "Olmec Civilization": { name: "Tepetl", title: "Olmec Ruler" },
      "Chavín Culture": { name: "Huántar", title: "Oracle of Chavín" },
    },
    worldEvents: ["The Senate convenes to debate a foreign war.", "A gladiatorial spectacle is announced."],
  },
  {
    id: "lateAntiquity", year: 400, label: "Late Antiquity", currency: "solidi", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Byzantium", "Visigothic Kingdom", "Sassanid Persia", "Kingdom of Aksum", "Gupta Empire", "Kingdom of Tikal"],
    npcs: {
      Byzantium: { name: "Theodosius", title: "Emperor" },
      "Visigothic Kingdom": { name: "Alaric", title: "King" },
      "Sassanid Persia": { name: "Shapur", title: "Shahanshah" },
      "Kingdom of Aksum": { name: "Ezana", title: "King of Aksum" },
      "Gupta Empire": { name: "Chandragupta II", title: "Maharajadhiraja" },
      "Kingdom of Tikal": { name: "Chak Tok Ich'aak", title: "Ajaw of Tikal" },
    },
    worldEvents: ["Refugees stream in from the frontier provinces.", "A church council debates matters of doctrine."],
  },
  {
    id: "earlyMedieval", year: 700, label: "Early Medieval", currency: "silver pennies", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Francia", "Umayyad Caliphate", "Anglo-Saxon England", "Ghana Empire", "Tang Dynasty China", "Kingdom of Copán"],
    npcs: {
      Francia: { name: "Pepin", title: "Mayor of the Palace" },
      "Umayyad Caliphate": { name: "Al-Walid", title: "Caliph" },
      "Anglo-Saxon England": { name: "Ine", title: "King of Wessex" },
      "Ghana Empire": { name: "Kaya Magha", title: "Ghana (King)" },
      "Tang Dynasty China": { name: "Empress Wu", title: "Emperor" },
      "Kingdom of Copán": { name: "Uaxaclajuun Ubʼaah Kʼawiil", title: "Ajaw of Copán" },
    },
    worldEvents: ["A monastery scriptorium seeks new copyists.", "Raiders are sighted along the coast."],
  },
  {
    id: "highMedieval", year: 1200, label: "High Medieval", currency: "silver pennies", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["England", "France", "Holy Roman Empire", "Mali Empire", "Delhi Sultanate", "Kingdom of Cusco"],
    npcs: {
      England: { name: "John", title: "King" },
      France: { name: "Philip Augustus", title: "King" },
      "Holy Roman Empire": { name: "Otto", title: "Emperor" },
      "Mali Empire": { name: "Sundiata Keita", title: "Mansa" },
      "Delhi Sultanate": { name: "Qutb al-Din Aibak", title: "Sultan" },
      "Kingdom of Cusco": { name: "Manco Cápac", title: "Sapa Inca" },
    },
    worldEvents: ["A cathedral's construction draws craftsmen from afar.", "The barons murmur of a new charter of rights."],
  },
  {
    id: "preColumbianAmericas", year: 1300, label: "Pre-Columbian Americas", currency: "cacao beans", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Aztec Triple Alliance", "Kingdom of Cusco", "Mississippian Cahokia", "Chimú Kingdom", "Ancestral Puebloans", "Purépecha Kingdom"],
    npcs: {
      "Aztec Triple Alliance": { name: "Acamapichtli", title: "Tlatoani" },
      "Kingdom of Cusco": { name: "Sinchi Roca", title: "Sapa Inca" },
      "Mississippian Cahokia": { name: "Corn Chief", title: "Paramount Chief" },
      "Chimú Kingdom": { name: "Minchançaman", title: "King of Chimor" },
      "Ancestral Puebloans": { name: "Chaco", title: "Sun Priest" },
      "Purépecha Kingdom": { name: "Tariacuri", title: "Cazonci" },
    },
    worldEvents: ["Tribute bearers arrive from a subject town.", "The priests announce an auspicious date on the calendar."],
  },
  {
    id: "subSaharanAfrica", year: 1350, label: "West & Southern African Kingdoms", currency: "gold dust", trackSet: "generic",
    classes: DEFAULT_CLASSES,
    nations: ["Mali Empire", "Kingdom of Kongo", "Great Zimbabwe", "Kingdom of Benin", "Ethiopian Empire", "Kanem-Bornu Empire"],
    npcs: {
      "Mali Empire": { name: "Mansa Musa", title: "Mansa" },
      "Kingdom of Kongo": { name: "Nimi a Lukeni", title: "Manikongo" },
      "Great Zimbabwe": { name: "Nyatsimba", title: "Mambo" },
      "Kingdom of Benin": { name: "Oba Eweka", title: "Oba of Benin" },
      "Ethiopian Empire": { name: "Amda Seyon", title: "Emperor" },
      "Kanem-Bornu Empire": { name: "Dunama", title: "Mai of Kanem" },
    },
    worldEvents: ["A gold caravan departs for the northern markets.", "Griots recount the deeds of the ruling house."],
  },
  {
    id: "renaissance", year: 1500, label: "Renaissance & Exploration", currency: "ducats", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["Florence", "Portugal", "Ottoman Empire", "Songhai Empire", "Ming Dynasty China", "Aztec Empire"],
    npcs: {
      Florence: { name: "Lorenzo", title: "Signore" },
      Portugal: { name: "Manuel", title: "King" },
      "Ottoman Empire": { name: "Bayezid", title: "Sultan" },
      "Songhai Empire": { name: "Askia Muhammad", title: "Askia" },
      "Ming Dynasty China": { name: "Hongzhi Emperor", title: "Emperor" },
      "Aztec Empire": { name: "Moctezuma II", title: "Huey Tlatoani" },
    },
    worldEvents: ["A workshop unveils a startling new technique.", "Ships return from a voyage with unfamiliar cargo."],
  },
  {
    id: "colonialAmericas", year: 1630, label: "Colonial Americas", currency: "pieces of eight", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["New Spain", "New England", "New France", "New Netherland", "Iroquois Confederacy", "Powhatan Confederacy"],
    npcs: {
      "New Spain": { name: "Diego", title: "Viceroy" },
      "New England": { name: "Winthrop", title: "Governor" },
      "New France": { name: "Champlain", title: "Governor" },
      "New Netherland": { name: "Wouter van Twiller", title: "Director-General" },
      "Iroquois Confederacy": { name: "Otreouti", title: "Sachem" },
      "Powhatan Confederacy": { name: "Opechancanough", title: "Paramount Chief" },
    },
    worldEvents: ["A ship arrives from the old country with new settlers.", "Tensions rise over disputed land claims."],
  },
  {
    id: "absolutism", year: 1650, label: "Age of Absolutism", currency: "livres", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["France", "Spain", "Sweden", "Mughal Empire", "Oyo Empire", "Iroquois Confederacy"],
    npcs: {
      France: { name: "Louis", title: "King" },
      Spain: { name: "Philip", title: "King" },
      Sweden: { name: "Christina", title: "Queen" },
      "Mughal Empire": { name: "Shah Jahan", title: "Padishah" },
      "Oyo Empire": { name: "Alaafin Ajagbo", title: "Alaafin" },
      "Iroquois Confederacy": { name: "Garakontie", title: "Sachem" },
    },
    worldEvents: ["The court gossips about a new royal favorite.", "War taxes stir grumbling in the provinces."],
  },
  {
    id: "enlightenment", year: 1750, label: "Enlightenment & Empire", currency: "pounds sterling", trackSet: "earlyModern",
    classes: DEFAULT_CLASSES,
    nations: ["Great Britain", "Prussia", "Qing China", "Ashanti Empire", "Thirteen Colonies", "Russian Empire"],
    npcs: {
      "Great Britain": { name: "Pitt", title: "Prime Minister" },
      Prussia: { name: "Frederick", title: "King" },
      "Qing China": { name: "Qianlong", title: "Emperor" },
      "Ashanti Empire": { name: "Opoku Ware I", title: "Asantehene" },
      "Thirteen Colonies": { name: "Benjamin Franklin", title: "Statesman" },
      "Russian Empire": { name: "Elizabeth", title: "Empress" },
    },
    worldEvents: ["A pamphlet debating natural rights circulates in coffeehouses.", "A trading company reports a windfall from the colonies."],
  },
  {
    id: "europe1897", year: 1897, label: "Europe, Age of Empires", currency: "pounds sterling", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["Britain", "German Empire", "Austria-Hungary", "Empire of Japan", "Ethiopian Empire", "United States"],
    npcs: {
      Britain: { name: "Salisbury", title: "Prime Minister" },
      "German Empire": { name: "Wilhelm", title: "Kaiser" },
      "Austria-Hungary": { name: "Franz Joseph", title: "Emperor" },
      "Empire of Japan": { name: "Meiji Emperor", title: "Emperor" },
      "Ethiopian Empire": { name: "Menelik II", title: "Emperor" },
      "United States": { name: "William McKinley", title: "President" },
    },
    worldEvents: ["A new rail line opens to great fanfare.", "Naval rivalry dominates the newspapers."],
  },
  {
    id: "coldWar", year: 1950, label: "Cold War Era", currency: "dollars", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["United States", "Soviet Union", "United Kingdom", "People's Republic of China", "Ethiopia", "Brazil"],
    npcs: {
      "United States": { name: "Eisenhower", title: "President" },
      "Soviet Union": { name: "Khrushchev", title: "First Secretary" },
      "United Kingdom": { name: "Churchill", title: "Prime Minister" },
      "People's Republic of China": { name: "Mao Zedong", title: "Chairman" },
      Ethiopia: { name: "Haile Selassie", title: "Emperor" },
      Brazil: { name: "Getúlio Vargas", title: "President" },
    },
    worldEvents: ["A satellite launch dominates the news.", "Diplomats trade tense words at a summit."],
  },
  {
    id: "contemporary", year: 2000, label: "Contemporary World", currency: "dollars", trackSet: "modern",
    classes: DEFAULT_CLASSES,
    nations: ["United States", "Japan", "Germany", "China", "India", "South Africa"],
    npcs: {
      "United States": { name: "The President", title: "President" },
      Japan: { name: "The Prime Minister", title: "Prime Minister" },
      Germany: { name: "The Chancellor", title: "Chancellor" },
      China: { name: "Jiang Zemin", title: "President" },
      India: { name: "Atal Bihari Vajpayee", title: "Prime Minister" },
      "South Africa": { name: "Thabo Mbeki", title: "President" },
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
// nations can be browsed continent-first.
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

  // Added in the nation-roster expansion pass:
  "Indus Valley": "Asia", Nubia: "Africa", "Caral-Supe": "The Americas",
  "Cycladic Culture": "Europe", "Megalithic Iberia": "Europe", "Valdivia Culture": "The Americas",
  "Kingdom of Kush": "Africa", "Minoan Crete": "Europe", "Unetice Culture": "Europe",
  "Norte Chico": "The Americas", "Poverty Point Culture": "The Americas",
  "Nuragic Sardinia": "Europe", "Olmec Civilization": "The Americas", "Kotosh Tradition": "The Americas",
  "Nok Culture": "Africa", Etruria: "Europe", "Hallstatt Celts": "Europe", "Chavín Culture": "The Americas",
  Magadha: "Asia", "Zhou Dynasty China": "Asia", "Zapotec Civilization": "The Americas",
  "Mauryan Empire": "Asia", "Qin Dynasty China": "Asia", "Roman Republic": "Europe",
  "Kingdom of El Mirador": "The Americas", Numidia: "Africa", "Celtiberian Iberia": "Europe",
  "Salinar Culture": "The Americas", Parthia: "Asia", Epirus: "Europe",
  "Kingdom of Aksum": "Africa", "Gupta Empire": "Asia", "Kingdom of Tikal": "The Americas",
  "Ghana Empire": "Africa", "Tang Dynasty China": "Asia", "Kingdom of Copán": "The Americas",
  "Delhi Sultanate": "Asia", "Chimú Kingdom": "The Americas", "Ancestral Puebloans": "The Americas",
  "Purépecha Kingdom": "The Americas", "Kingdom of Benin": "Africa", "Ethiopian Empire": "Africa",
  "Kanem-Bornu Empire": "Africa", "Songhai Empire": "Africa", "Ming Dynasty China": "Asia",
  "Aztec Empire": "The Americas", "New Netherland": "The Americas", "Iroquois Confederacy": "The Americas",
  "Powhatan Confederacy": "The Americas", "Mughal Empire": "Asia", "Oyo Empire": "Africa",
  "Ashanti Empire": "Africa", "Thirteen Colonies": "The Americas", "Russian Empire": "Europe",
  "Empire of Japan": "Asia", Ethiopia: "Africa", "People's Republic of China": "Asia",
  Brazil: "The Americas", China: "Asia", India: "Asia", "South Africa": "Africa",
};
