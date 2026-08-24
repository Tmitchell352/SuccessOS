// Historical milestones, per docs/DYNASTY_HANDOFF.md Section 6's last
// bullet: "~26 fixed historical milestones apply a flat delta and require
// only an acknowledgment click, but 5 of the most significant ones ...
// present real branching choices that get recorded specifically for that
// dynasty." The doc names 4 branching examples (Caesar's assassination,
// the French Revolution, 1848, the 2008 financial crisis); the 5th (the
// Black Death) was chosen independently to round out the set to 5, same
// as every other piece of content in this rebuild that the original source
// didn't survive to provide.
//
// Fires once per dynasty (tracked in Dynasty.firedMilestones), regardless
// of which generation is alive when the year is reached - milestones are
// world history, not personal history.

export type MilestoneChoice = {
  id: string;
  label: string;
  description: string;
  nationPowerDelta: number;
  statDelta: Partial<{ influence: number; skill: number; wealth: number; health: number; popularity: number }>;
};

export type Milestone = {
  id: string;
  year: number;
  label: string;
  description: string;
} & (
  | { branching: false; nationPowerDelta: number }
  | { branching: true; choices: MilestoneChoice[] }
);

export const MILESTONES: Milestone[] = [
  { id: "greatPyramid", year: -2560, label: "The Great Pyramid", description: "The Great Pyramid of Giza is completed.", branching: false, nationPowerDelta: 3 },
  { id: "hammurabi", year: -1750, label: "Code of Hammurabi", description: "A sweeping new code of law is promulgated in Babylon.", branching: false, nationPowerDelta: 2 },
  { id: "bronzeCollapse", year: -1200, label: "Bronze Age Collapse", description: "Great palace-states across the eastern Mediterranean fall in quick succession.", branching: false, nationPowerDelta: -8 },
  { id: "olympics", year: -776, label: "The First Olympics", description: "The first recorded Olympic Games are held at Olympia.", branching: false, nationPowerDelta: 2 },
  { id: "romanRepublic", year: -509, label: "The Roman Republic", description: "Rome overthrows its monarchy and founds a republic.", branching: false, nationPowerDelta: 3 },
  { id: "qinUnification", year: -221, label: "Qin Unifies China", description: "The Qin state unifies the warring kingdoms of China.", branching: false, nationPowerDelta: 4 },
  {
    id: "caesarAssassination", year: -44, label: "The Ides of March",
    description: "Julius Caesar has been assassinated on the floor of the Senate. Rome holds its breath.",
    branching: true,
    choices: [
      { id: "side_conspirators", label: "Side with the conspirators", description: "Back the Senate's cause against tyranny.", nationPowerDelta: -5, statDelta: { influence: 8, popularity: -10 } },
      { id: "side_caesarians", label: "Side with Caesar's heirs", description: "Rally behind those loyal to Caesar's memory.", nationPowerDelta: 3, statDelta: { influence: -5, popularity: 10 } },
      { id: "stay_neutral", label: "Stay neutral", description: "Wait to see how the dust settles before committing to a side.", nationPowerDelta: 1, statDelta: {} },
    ],
  },
  { id: "vesuvius", year: 79, label: "Vesuvius Erupts", description: "Mount Vesuvius buries Pompeii and Herculaneum.", branching: false, nationPowerDelta: -3 },
  { id: "edictOfMilan", year: 313, label: "Edict of Milan", description: "Christianity is legalized throughout the Roman Empire.", branching: false, nationPowerDelta: 2 },
  { id: "fallOfRome", year: 476, label: "Fall of Rome", description: "The last Western Roman Emperor is deposed.", branching: false, nationPowerDelta: -6 },
  { id: "hijra", year: 622, label: "The Hijra", description: "The migration that marks the start of the Islamic calendar reshapes the region.", branching: false, nationPowerDelta: 3 },
  { id: "lindisfarne", year: 793, label: "Raid on Lindisfarne", description: "A Viking raid on a coastal monastery marks the start of the Viking Age.", branching: false, nationPowerDelta: -2 },
  { id: "magnaCarta", year: 1215, label: "Magna Carta", description: "English barons force the king to accept new limits on royal power.", branching: false, nationPowerDelta: 3 },
  {
    id: "blackDeath", year: 1347, label: "The Black Death",
    description: "Plague sweeps through the region, emptying streets and filling graveyards.",
    branching: true,
    choices: [
      { id: "flee", label: "Flee the city", description: "Abandon home and business for the relative safety of the countryside.", nationPowerDelta: -2, statDelta: { health: 10, wealth: -30, popularity: -5 } },
      { id: "treat_the_sick", label: "Stay and treat the sick", description: "Risk exposure to tend to the afflicted.", nationPowerDelta: 0, statDelta: { health: -15, influence: 15, popularity: 20 } },
      { id: "hoard_resources", label: "Hoard resources and isolate", description: "Shut the doors and wait it out, whatever the cost to reputation.", nationPowerDelta: -1, statDelta: { wealth: 20, popularity: -15, health: 3 } },
    ],
  },
  { id: "fallOfConstantinople", year: 1453, label: "Fall of Constantinople", description: "Constantinople falls, ending the Byzantine Empire.", branching: false, nationPowerDelta: -4 },
  { id: "columbus", year: 1492, label: "Columbus Reaches the Americas", description: "News arrives of land found across the western ocean.", branching: false, nationPowerDelta: 3 },
  { id: "reformation", year: 1517, label: "The Reformation Begins", description: "A challenge to church authority splits Christendom.", branching: false, nationPowerDelta: -2 },
  { id: "dutchEastIndia", year: 1602, label: "The Dutch East India Company", description: "A new kind of trading company is chartered, reshaping global commerce.", branching: false, nationPowerDelta: 2 },
  { id: "principia", year: 1687, label: "Principia Mathematica", description: "A sweeping new account of the laws of motion is published.", branching: false, nationPowerDelta: 2 },
  { id: "usDeclaration", year: 1776, label: "American Declaration of Independence", description: "Thirteen colonies declare independence across the ocean.", branching: false, nationPowerDelta: 2 },
  {
    id: "frenchRevolution", year: 1789, label: "The French Revolution",
    description: "Paris rises. The old order is being torn down in real time.",
    branching: true,
    choices: [
      { id: "join_revolutionaries", label: "Join the revolutionaries", description: "Throw your lot in with the movement for change.", nationPowerDelta: -5, statDelta: { influence: 10, popularity: 15, wealth: -20 } },
      { id: "support_monarchy", label: "Support the old order", description: "Stand with the crown against the mob.", nationPowerDelta: -8, statDelta: { influence: -10, popularity: -15, wealth: 10 } },
      { id: "flee_the_country", label: "Flee the country", description: "Take what you can carry and get out while it's still possible.", nationPowerDelta: -10, statDelta: { wealth: -40, health: 5 } },
    ],
  },
  {
    id: "revolutionsOf1848", year: 1848, label: "The Revolutions of 1848",
    description: "Uprisings sweep across Europe, one capital after another.",
    branching: true,
    choices: [
      { id: "join_the_uprising", label: "Join the uprising", description: "Take to the streets for reform.", nationPowerDelta: -4, statDelta: { influence: 8, popularity: 12 } },
      { id: "back_the_old_order", label: "Back the old order", description: "Side with the establishment against the crowds.", nationPowerDelta: 2, statDelta: { popularity: -10 } },
      { id: "stay_out_of_it", label: "Stay out of it", description: "Keep your head down and your business running.", nationPowerDelta: 0, statDelta: { wealth: 5 } },
    ],
  },
  { id: "wwiBegins", year: 1914, label: "The Great War Begins", description: "Europe's alliances drag the continent into war.", branching: false, nationPowerDelta: -8 },
  { id: "wallStreetCrash", year: 1929, label: "The Wall Street Crash", description: "Markets collapse, dragging economies down with them.", branching: false, nationPowerDelta: -6 },
  { id: "moonLanding", year: 1969, label: "The Moon Landing", description: "Humanity sets foot on the Moon for the first time.", branching: false, nationPowerDelta: 4 },
  {
    id: "financialCrisis2008", year: 2008, label: "The Global Financial Crisis",
    description: "Markets are in freefall and institutions are collapsing overnight.",
    branching: true,
    choices: [
      { id: "double_down", label: "Double down on investments", description: "Bet that the market will recover - a real gamble.", nationPowerDelta: -1, statDelta: { wealth: -40, skill: 5 } },
      { id: "play_it_safe", label: "Play it safe", description: "Cut losses and wait out the storm.", nationPowerDelta: 0, statDelta: { wealth: -10, health: 3 } },
      { id: "help_others_weather_it", label: "Help others weather it", description: "Use what you have to support those hit hardest.", nationPowerDelta: 2, statDelta: { popularity: 15, wealth: -20, influence: 5 } },
    ],
  },
];

export const MILESTONE_BY_ID: Record<string, Milestone> = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));
