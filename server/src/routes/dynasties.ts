import { Router } from "express";
import type { Dynasty, DynastySave, VictoryGoal } from "@dynasty/shared";
import { EPOCH_BY_ID } from "@dynasty/shared";

const VICTORY_GOALS: VictoryGoal[] = ["none", "gen10", "legacy300", "legacy750"];
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import { newDynasty, newFoundingCharacter, toTreeRecord } from "../game/engine/factory.js";
import { initRelations } from "../game/engine/geopolitics.js";
import { writeChronicle } from "../game/ai/eventGenerator.js";

export const dynastiesRouter = Router();
dynastiesRouter.use(requireAuth);

type Row = {
  id: string;
  slot_index: number;
  name: string;
  dynasty: unknown;
  character: unknown;
  updated_at: string;
};

function rowToSave(row: Row): DynastySave {
  return {
    slotIndex: row.slot_index,
    name: row.name,
    dynasty: deserializeDynasty(row.dynasty),
    character: deserializeCharacter(row.character),
    updatedAt: row.updated_at,
  };
}

// GET /dynasties - list this user's save slots
dynastiesRouter.get("/", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const supabase = clientForToken(accessToken);
  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("id, slot_index, name, dynasty, character, updated_at")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ slots: (data as Row[]).map(rowToSave) });
});

// POST /dynasties - create a new dynasty in the given slot with a founding character
dynastiesRouter.post("/", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const { slotIndex, motto, difficulty, tone, epochId, nation, characterName, victoryGoal } = req.body ?? {};
  if (typeof slotIndex !== "number" || !epochId || !nation) {
    return res.status(400).json({ error: "slotIndex, epochId, and nation are required" });
  }
  if (!EPOCH_BY_ID[epochId]) return res.status(400).json({ error: `Unknown epoch ${epochId}` });
  if (victoryGoal !== undefined && !VICTORY_GOALS.includes(victoryGoal)) {
    return res.status(400).json({ error: `victoryGoal must be one of ${VICTORY_GOALS.join(", ")}` });
  }

  let character;
  try {
    character = newFoundingCharacter(epochId, nation, characterName);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }

  const dynasty: Dynasty = newDynasty(motto || `House of ${character.name.split(" ")[1] ?? character.name}`, difficulty || "standard", tone || "balanced");
  if (victoryGoal) dynasty.victoryGoal = victoryGoal;
  dynasty.currentId = character.id;
  dynasty.people[character.id] = toTreeRecord(character, null, 1);
  initRelations(character, dynasty);

  const supabase = clientForToken(accessToken);
  const { data, error } = await supabase
    .from("dynasty_saves")
    .upsert(
      {
        user_id: userId,
        slot_index: slotIndex,
        name: dynasty.motto,
        dynasty: serializeDynasty(dynasty),
        character: serializeCharacter(character),
      },
      { onConflict: "user_id,slot_index" }
    )
    .select("id, slot_index, name, dynasty, character, updated_at")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ slot: rowToSave(data as Row) });
});

// GET /dynasties/:slotIndex
dynastiesRouter.get("/:slotIndex", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);
  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("id, slot_index, name, dynasty, character, updated_at")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });
  res.json({ slot: rowToSave(data as Row) });
});

// GET /dynasties/:slotIndex/chronicle - an on-demand narrative generator
// (Section 9), regenerated fresh each call since it's a snapshot of the
// dynasty's current history rather than a one-time event like a eulogy
// (still cached until the next call overwrites it, on Dynasty.chronicleText).
dynastiesRouter.get("/:slotIndex/chronicle", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);
  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  const chronicle = await writeChronicle(dynasty);
  dynasty.chronicleText = chronicle;

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ chronicle });
});

// POST /dynasties/:slotIndex/settings - dynasty-level preferences that
// aren't tied to a living character, so (unlike willStyle/familySeat in
// economy.ts) this works even between generations. noAiMode existed on
// Dynasty since the first commit ("player opt-out of AI-generated story
// turns", handoff doc's illustrative literal) with no way to ever set it -
// dynasties were permanently stuck at the factory default of false.
dynastiesRouter.post("/:slotIndex/settings", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { noAiMode } = req.body ?? {};
  if (typeof noAiMode !== "boolean") return res.status(400).json({ error: "noAiMode (boolean) is required" });
  const supabase = clientForToken(accessToken);

  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No save in that slot" });

  const dynasty = deserializeDynasty(data.dynasty);
  dynasty.noAiMode = noAiMode;

  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({ dynasty });
});

// DELETE /dynasties/:slotIndex
dynastiesRouter.delete("/:slotIndex", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);
  const { error } = await supabase.from("dynasty_saves").delete().eq("user_id", userId).eq("slot_index", slotIndex);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});
