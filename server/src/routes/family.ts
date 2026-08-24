import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { clientForToken } from "../supabase.js";
import { deserializeCharacter, deserializeDynasty, serializeCharacter, serializeDynasty } from "../game/engine/persistence.js";
import { applyParenting, marry, type ParentingStyle, type SuitorProspect } from "../game/engine/family.js";
import { generateSuitors } from "../game/ai/eventGenerator.js";

// Explicit player-initiated family actions (Section 8). Like geopolitics.ts,
// marriage and parenting are real player choices, so each is its own
// endpoint rather than folded into /turn/:slotIndex/advance.
export const familyRouter = Router();
familyRouter.use(requireAuth);

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

// GET /family/:slotIndex/suitors - three marriage prospects (Section 8):
// AI-generated when a key is configured and noAiMode is off, deterministic
// otherwise (generateSuitors itself falls back on any AI failure).
familyRouter.get("/:slotIndex/suitors", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  res.json({ suitors: await generateSuitors(loaded.character, loaded.dynasty) });
});

// POST /family/:slotIndex/marry - body: { suitor: SuitorProspect,
// arrangedWithNation?: string }. The client passes back the suitor object
// it got from GET .../suitors (or fabricates one for a fully-arranged
// match) rather than re-deriving it server-side from a seed.
familyRouter.post("/:slotIndex/marry", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { suitor, arrangedWithNation } = (req.body ?? {}) as { suitor?: SuitorProspect; arrangedWithNation?: string };
  if (!suitor || typeof suitor.name !== "string") {
    return res.status(400).json({ error: "suitor is required" });
  }
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  const result = marry(character, dynasty, suitor, arrangedWithNation);
  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });
  res.json({ character, dynasty, ...result });
});

// POST /family/:slotIndex/parenting - body: { childName, style }
const PARENTING_STYLES: ParentingStyle[] = ["strict", "permissive", "educate", "labor"];
familyRouter.post("/:slotIndex/parenting", async (req, res) => {
  const { userId, accessToken } = req as unknown as AuthedRequest;
  const slotIndex = Number(req.params.slotIndex);
  const { childName, style } = req.body ?? {};
  if (!childName || !PARENTING_STYLES.includes(style)) {
    return res.status(400).json({ error: `childName and style (${PARENTING_STYLES.join("|")}) are required` });
  }
  const supabase = clientForToken(accessToken);
  const loaded = await loadLiving(supabase, userId, slotIndex);
  if (isError(loaded)) return res.status(loaded.status).json({ error: loaded.error });
  const { dynasty, character } = loaded;
  const result = applyParenting(character, childName, style);
  const { error: saveError } = await supabase
    .from("dynasty_saves")
    .update({ dynasty: serializeDynasty(dynasty), character: serializeCharacter(character), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slot_index", slotIndex);
  if (saveError) return res.status(500).json({ error: saveError.message });
  res.json({ character, dynasty, ...result });
});
