import { Router } from "express";
import { COURT_FACTIONS } from "@dynasty/shared";
import type { CourtFaction } from "@dynasty/shared";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import {
  attemptConquest,
  convertFaith,
  courtFactionSupport,
  forgeAlliance,
  manageIntegration,
  seizePower,
  sendEspionage,
} from "../game/engine/geopolitics.js";

// Explicit player-initiated geopolitical actions (Section 6). Unlike the
// automatic per-turn tick in game/engine/geopolitics.ts, these are real
// player choices, so each is its own endpoint rather than folded into
// /turn/:slotIndex/advance - matches how the original design treats them
// (dynasty actions and track-gated abilities the player opts into).
export const geopoliticsRouter = Router();
geopoliticsRouter.use(requireAuth);

type Loaded = { dynasty: ReturnType<typeof deserializeDynasty>; character: NonNullable<ReturnType<typeof deserializeCharacter>> } | null;

async function loadLivingCharacter(
  supabase: ReturnType<typeof clientForToken>,
  userId: string,
  slotIndex: number
): Promise<{ error: string; status: number } | Loaded> {
  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  if (!data) return { error: "No save in that slot", status: 404 };
  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return { error: "No living character in that slot", status: 400 };
  return { dynasty, character };
}

function isError(x: unknown): x is { error: string; status: number } {
  return typeof x === "object" && x !== null && "error" in x;
}

async function saveAndRespond(
  supabase: ReturnType<typeof clientForToken>,
  userId: string,
  slotIndex: number,
  dynasty: ReturnType<typeof deserializeDynasty>,
  character: NonNullable<ReturnType<typeof deserializeCharacter>>,
  res: import("express").Response,
  result: { log: string[]; success: boolean }
) {
  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });
  res.json({ character, dynasty, ...result });
}

geopoliticsRouter.post("/:slotIndex/seize-power", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = seizePower(character);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/conquest", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { targetNation, mode } = req.body ?? {};
  if (!targetNation || (mode !== "absorbed" && mode !== "destroyed")) {
    return res.status(400).json({ error: "targetNation and mode ('absorbed'|'destroyed') are required" });
  }
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = attemptConquest(character, dynasty, targetNation, mode);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/alliance", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { targetNation } = req.body ?? {};
  if (!targetNation) return res.status(400).json({ error: "targetNation is required" });
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = forgeAlliance(character, dynasty, targetNation);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/espionage", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { targetNation } = req.body ?? {};
  if (!targetNation) return res.status(400).json({ error: "targetNation is required" });
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = sendEspionage(character, dynasty, targetNation);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/integration", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { nation, action } = req.body ?? {};
  if (!nation || (action !== "pacify" && action !== "suppress")) {
    return res.status(400).json({ error: "nation and action ('pacify'|'suppress') are required" });
  }
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = manageIntegration(character, dynasty, nation, action);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/convert", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { targetNation } = req.body ?? {};
  if (!targetNation) return res.status(400).json({ error: "targetNation is required" });
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = convertFaith(character, dynasty, targetNation);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});

geopoliticsRouter.post("/:slotIndex/court-faction", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { faction } = req.body ?? {};
  if (!COURT_FACTIONS.includes(faction)) {
    return res.status(400).json({ error: `faction must be one of ${COURT_FACTIONS.join(", ")}` });
  }
  const supabase = clientForToken(accessToken);
  const loaded = await loadLivingCharacter(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded!;
  const result = courtFactionSupport(character, faction as CourtFaction);
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});
