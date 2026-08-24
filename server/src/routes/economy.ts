import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import { attemptVenture, buyProperty, giftToChild, giftToSpouse, repayDebt, takeLoan } from "../game/engine/economy.js";

// Explicit player-initiated economy actions (Section 7): buying property,
// taking/repaying a loan, risky ventures, and gifting to family. Like
// geopolitics.ts and family.ts, these are real player choices, so each is
// its own endpoint rather than folded into /turn/:slotIndex/advance.
export const economyRouter = Router();
economyRouter.use(requireAuth);

async function loadLiving(supabase: ReturnType<typeof clientForToken>, userId: string, slotIndex: number) {
  const { data, error } = await supabase
    .from("dynasty_saves")
    .select("dynasty, character")
    .eq("user_id", userId)
    .eq("slot_index", slotIndex)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 } as const;
  if (!data) return { error: "No save in that slot", status: 404 } as const;
  const dynasty = deserializeDynasty(data.dynasty);
  const character = deserializeCharacter(data.character);
  if (!character || !character.alive) return { error: "No living character in that slot", status: 400 } as const;
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

economyRouter.post("/:slotIndex/buy-property", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { typeId } = req.body ?? {};
  if (!typeId) return res.status(400).json({ error: "typeId is required" });
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, buyProperty(character, typeId));
});

economyRouter.post("/:slotIndex/loan", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { amount } = req.body ?? {};
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, takeLoan(character, Number(amount)));
});

economyRouter.post("/:slotIndex/repay-debt", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { amount } = req.body ?? {};
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, repayDebt(character, Number(amount)));
});

economyRouter.post("/:slotIndex/venture", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { stake } = req.body ?? {};
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, attemptVenture(character, Number(stake)));
});

economyRouter.post("/:slotIndex/gift", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { target, childName, amount } = req.body ?? {};
  if (target !== "spouse" && target !== "child") return res.status(400).json({ error: "target must be 'spouse' or 'child'" });
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  const result = target === "spouse" ? giftToSpouse(character, Number(amount)) : giftToChild(character, childName, Number(amount));
  await saveAndRespond(supabase, userId, slotIndex, dynasty, character, res, result);
});
