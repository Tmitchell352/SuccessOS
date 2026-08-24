import { Router } from "express";
import { computeInheritanceFriction } from "@dynasty/shared";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import { advanceYear } from "../game/engine/turn.js";
import { generateEvent, resolveCustomAction, writeEulogy } from "../game/ai/eventGenerator.js";
import { toTreeRecord } from "../game/engine/factory.js";
import { computeHeirStatBonuses } from "../game/engine/family.js";
import { resolveMilestone } from "../game/engine/milestones.js";
import { changeCareer, chooseSpecialization } from "../game/engine/tracks.js";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export const turnRouter = Router();
turnRouter.use(requireAuth);

// POST /turn/:slotIndex/advance - the main per-turn loop (Section 9).
// Runs the deterministic engine, then (unless noAiMode / no key) asks the
// AI for one narrative beat, per the "only 4 things call the AI" rule.
turnRouter.post("/:slotIndex/advance", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) {
    return res.status(400).json({ error: "No living character to advance - choose an heir first" });
  }
  if (character.pendingMilestone) {
    return res.status(400).json({ error: "Resolve the pending historical milestone first", pendingMilestone: character.pendingMilestone });
  }

  const result = advanceYear(character, dynasty);
  let narrative: string | null = null;
  // Skip the AI narrative beat if a branching milestone just paused the
  // turn - nothing to narrate onto until the player actually chooses.
  if (!result.died && !result.character.pendingMilestone) {
    narrative = await generateEvent(result.character, result.dynasty);
    result.character.log[result.character.log.length - 1].text += ` ${narrative}`;
  }

  // keep the tree record for this person current (Section 2's TreeRecord)
  const existing = result.dynasty.people[result.character.id];
  result.dynasty.people[result.character.id] = {
    ...existing,
    deathYear: result.character.alive ? null : result.character.year,
    cause: result.character.deathCause,
    age: result.character.age,
    peakInfluence: Math.max(existing?.peakInfluence ?? 0, result.character.stats.influence),
    peakWealth: Math.max(existing?.peakWealth ?? 0, result.character.stats.wealth),
    peakSkill: Math.max(existing?.peakSkill ?? 0, result.character.stats.skill),
    peakPopularity: Math.max(existing?.peakPopularity ?? 0, result.character.stats.popularity),
  };

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({
      dynasty: serializeDynasty(result.dynasty),
      character: serializeCharacter(result.character),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character: result.character, dynasty: result.dynasty, log: result.log, narrative, died: result.died, victoryAchieved: result.victoryAchieved });
});

// POST /turn/:slotIndex/choose-heir - after a death, pick a child to
// continue the dynasty as (Section 1: "the player chooses an heir").
turnRouter.post("/:slotIndex/choose-heir", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { childName } = req.body ?? {};
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const deceased = deserializeCharacter(data.character);
  if (!deceased || deceased.alive) return res.status(400).json({ error: "Current character is still alive" });

  const child = deceased.family.children.find((c) => c.name === childName);
  if (!child) return res.status(400).json({ error: "No such child of the deceased" });

  const parentRecord = dynasty.people[deceased.id];

  // Inheritance friction (Section 7, driven by Section 8's willStyle field):
  // a real cut taken at death before wealth transfers to the heir. willStyle
  // only does something once it feeds this calculation. Shared with the
  // client so GameOverScreen can preview the same number before the player
  // commits to an heir.
  const friction = computeInheritanceFriction(deceased.willStyle, dynasty.familySeat);
  const inheritedWealth = Math.round(deceased.stats.wealth * (1 - friction));

  // Active parenting choices + inherited traits leave a real stat mark on
  // the heir (Section 8), distinct from the flat starting stats every
  // other new character gets.
  const bonus = computeHeirStatBonuses(child);
  const baseStats = { influence: 5, skill: 5, wealth: inheritedWealth + Math.round(child.giftedWealth), health: 90, popularity: 10 };
  const heirStats = {
    influence: clamp(baseStats.influence + (bonus.influence ?? 0), 0, 100),
    skill: clamp(baseStats.skill + (bonus.skill ?? 0), 0, 100),
    wealth: clamp(baseStats.wealth + (bonus.wealth ?? 0), 0, 999),
    health: clamp(baseStats.health + (bonus.health ?? 0), 0, 100),
    popularity: clamp(baseStats.popularity + (bonus.popularity ?? 0), 0, 100),
  };

  // Will styles also shape sibling relations narratively (Section 8): a
  // passed-over eldest/youngest sibling under a favoring will starts the
  // heir's life with a built-in domestic rival.
  const otherChildren = deceased.family.children.filter((c) => c.name !== child.name);
  let startingRival: { name: string; age: number } | null = null;
  if (deceased.willStyle === "eldestFavored" && otherChildren.length) {
    const eldest = otherChildren.reduce((a, b) => (b.age > a.age ? b : a));
    if (eldest.age > child.age) startingRival = eldest;
  } else if (deceased.willStyle === "youngestFavored" && otherChildren.length) {
    const youngest = otherChildren.reduce((a, b) => (b.age < a.age ? b : a));
    if (youngest.age < child.age) startingRival = youngest;
  }

  const heir = {
    ...deceased,
    id: crypto.randomUUID(),
    name: child.name,
    age: child.age,
    trackId: null,
    trackTier: 0,
    stats: heirStats,
    family: { status: "single" as const, children: [] },
    domestic: startingRival ? { rivalName: startingRival.name, rivalTension: 60, rivalAge: startingRival.age } : {},
    traits: child.traits,
    specializations: {},
    imprisoned: null,
    debt: null,
    properties: deceased.properties,
    possessions: [],
    achievements: [],
    retired: false,
    log: [
      {
        age: child.age,
        year: deceased.year,
        text: startingRival
          ? `Inherited the dynasty upon ${deceased.name}'s death. The will favored their ${deceased.willStyle === "eldestFavored" ? "elder" : "younger"} sibling ${startingRival.name}, who resents being passed over as head of the family.`
          : `Inherited the dynasty upon ${deceased.name}'s death.`,
      },
    ],
    heat: 0,
    followers: 0,
    eliteStanding: 50,
    sportsRivalWins: 0,
    sportsRivalLosses: 0,
    convertedFaith: null,
    alive: true,
    deathCause: undefined,
    _erasWitnessed: [deceased.epochId],
    _traditionAppliedTracks: [],
    _hadDebt: false,
    _sentVenture: false,
    _wasDestitute: false,
    _survivedCrisis: false,
  };

  dynasty.currentId = heir.id;
  dynasty.people[heir.id] = toTreeRecord(heir, deceased.id, (parentRecord?.generation ?? 1) + 1);

  // Succession crisis (Section 6): a ruler dying without an adult heir
  // ready to inherit triggers a real nation-power penalty and a permanent
  // ticker entry.
  const wasRuler = deceased.trackId === "political" && deceased.trackTier === 3;
  if (wasRuler && heir.age < 18) {
    dynasty.nationPower = Math.max(0, dynasty.nationPower - 15);
    dynasty.eventTicker.push({
      year: deceased.year,
      text: `${deceased.name}'s death left the throne to a child heir, ${heir.name} - a succession crisis shook the realm.`,
    });
  }

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({
      dynasty: serializeDynasty(dynasty),
      character: serializeCharacter(heir),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character: heir, dynasty });
});

// POST /turn/:slotIndex/resolve-milestone - answers a pending branching
// historical milestone (Section 6's last bullet), unblocking /advance.
turnRouter.post("/:slotIndex/resolve-milestone", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { choiceId } = req.body ?? {};
  if (!choiceId) return res.status(400).json({ error: "choiceId is required" });
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return res.status(400).json({ error: "No living character in that slot" });
  if (!character.pendingMilestone) return res.status(400).json({ error: "No pending milestone to resolve" });

  const result = resolveMilestone(character, dynasty, choiceId);
  if (!result.success) return res.status(400).json({ error: result.log.join(" ") });

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character, dynasty, log: result.log, success: true });
});

// POST /turn/:slotIndex/custom-action - free-text player input (Section 9,
// one of the 4 AI call sites). Narrates an outcome and applies small,
// server-clamped stat effects - see resolveCustomAction's own comment for
// why the AI's proposed deltas are never trusted directly.
turnRouter.post("/:slotIndex/custom-action", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { actionText } = req.body ?? {};
  if (!actionText || typeof actionText !== "string" || !actionText.trim()) {
    return res.status(400).json({ error: "actionText is required" });
  }
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return res.status(400).json({ error: "No living character in that slot" });
  if (character.pendingMilestone) return res.status(400).json({ error: "Resolve the pending historical milestone first" });

  const result = await resolveCustomAction(character, dynasty, actionText.trim());
  if (result.statDelta.influence) character.stats.influence = clamp(character.stats.influence + result.statDelta.influence, 0, 100);
  if (result.statDelta.skill) character.stats.skill = clamp(character.stats.skill + result.statDelta.skill, 0, 100);
  if (result.statDelta.wealth) character.stats.wealth = clamp(character.stats.wealth + result.statDelta.wealth, 0, 999);
  if (result.statDelta.health) character.stats.health = clamp(character.stats.health + result.statDelta.health, 0, 100);
  if (result.statDelta.popularity) character.stats.popularity = clamp(character.stats.popularity + result.statDelta.popularity, 0, 100);
  character.log.push({ age: character.age, year: character.year, text: result.narrative });

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character, dynasty, narrative: result.narrative, statDelta: result.statDelta });
});

// GET /turn/:slotIndex/eulogy - an on-demand narrative generator (Section
// 9). Works on a just-deceased character (still in the slot until an heir
// is chosen). Cached on Dynasty.biographies so repeat views don't re-spend
// an API call.
turnRouter.get("/:slotIndex/eulogy", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || character.alive) return res.status(400).json({ error: "No deceased character in that slot" });

  if (dynasty.biographies[character.id]) {
    return res.json({ eulogy: dynasty.biographies[character.id] });
  }
  const eulogy = await writeEulogy(character, dynasty);
  dynasty.biographies[character.id] = eulogy;

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ eulogy });
});

// POST /turn/:slotIndex/choose-specialization - body: { specializationId }
// (Section 5's "specializations... prompted the first time a character has
// no specialization yet for their current track"). See
// ./game/engine/tracks.ts's chooseSpecialization for why this is a
// player-initiated route rather than a turn-pausing prompt.
turnRouter.post("/:slotIndex/choose-specialization", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { specializationId } = req.body ?? {};
  if (!specializationId) return res.status(400).json({ error: "specializationId is required" });
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return res.status(400).json({ error: "No living character in that slot" });

  const result = chooseSpecialization(character, specializationId);
  if (!result.success) return res.status(400).json({ error: result.log.join(" ") });
  character.log.push({ age: character.age, year: character.year, text: result.log.join(" ") });

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character, dynasty, log: result.log, success: true });
});

// POST /turn/:slotIndex/change-career - body: { trackId } (Section 5's
// "Change Career - mid-life track switching, available anytime after 18").
turnRouter.post("/:slotIndex/change-career", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { trackId } = req.body ?? {};
  if (!trackId) return res.status(400).json({ error: "trackId is required" });
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return res.status(400).json({ error: "No living character in that slot" });

  const result = changeCareer(character, dynasty, trackId);
  if (!result.success) return res.status(400).json({ error: result.log.join(" ") });
  character.log.push({ age: character.age, year: character.year, text: result.log.join(" ") });

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ character, dynasty, log: result.log, success: true });
});
