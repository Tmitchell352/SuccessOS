import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import { advanceYear } from "../game/engine/turn.js";
import { generateEvent } from "../game/ai/eventGenerator.js";
import { toTreeRecord } from "../game/engine/factory.js";

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

  const result = advanceYear(character, dynasty);
  let narrative: string | null = null;
  if (!result.died) {
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

  res.json({ character: result.character, dynasty: result.dynasty, log: result.log, narrative, died: result.died });
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
  const heir = {
    ...deceased,
    id: crypto.randomUUID(),
    name: child.name,
    age: child.age,
    trackId: null,
    trackTier: 0,
    stats: { influence: 5, skill: 5, wealth: Math.round(child.giftedWealth), health: 90, popularity: 10 },
    family: { status: "single" as const, children: [] },
    domestic: {},
    traits: child.traits,
    specializations: {},
    imprisoned: null,
    debt: null,
    properties: deceased.properties,
    possessions: [],
    achievements: [],
    retired: false,
    log: [{ age: child.age, year: deceased.year, text: `Inherited the dynasty upon ${deceased.name}'s death.` }],
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
