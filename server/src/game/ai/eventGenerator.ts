import Anthropic from "@anthropic-ai/sdk";
import type { Character, Dynasty } from "@dynasty/shared";
import { EPOCH_BY_ID } from "@dynasty/shared";
import { config } from "../../config.js";

// Per docs/DYNASTY_HANDOFF.md Section 9: "Only 4 things call the AI" -
// generateEvent (this file), resolveCustomAction, generateSuitors, and the
// on-demand narrative generators (chronicle/eulogy/biography). Everything
// else in the turn structure is deterministic (see ./engine/turn.ts).
//
// The API key lives ONLY in server env (see .env.example) and is never sent
// to the client. If it's unset, or the dynasty has noAiMode on, every call
// here falls back to a cheap deterministic line instead of throwing - the
// original's "No AI Narration" mode, preserved as the default-safe path.

const FALLBACK_BEATS = [
  "Life continued much as before.",
  "A season passed without great incident.",
  "Small troubles came and went.",
  "The year brought modest change.",
];

function deterministicFallback(): string {
  return FALLBACK_BEATS[Math.floor(Math.random() * FALLBACK_BEATS.length)];
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!config.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

function dynastyContext(dynasty: Dynasty): string {
  const parts: string[] = [`Dynasty motto: "${dynasty.motto}".`];
  if (dynasty.tradition !== "none") parts.push(`Family tradition: ${dynasty.tradition}.`);
  if (dynasty.conqueredNations.length) {
    parts.push(
      `Nations this dynasty has conquered: ${dynasty.conqueredNations
        .map((n) => `${n.nation} (${n.mode}, ${n.year})`)
        .join(", ")}.`
    );
  }
  return parts.join(" ");
}

export async function generateEvent(character: Character, dynasty: Dynasty): Promise<string> {
  if (dynasty.noAiMode) return deterministicFallback();
  const anthropic = getClient();
  if (!anthropic) return deterministicFallback();

  const epoch = EPOCH_BY_ID[character.epochId];
  const prompt = [
    `You are the narrator of a multi-generational life-simulation game called Dynasty.`,
    `Write ONE short (2-3 sentence) narrative beat for this character's current year. No choices, no options - just what happened.`,
    dynastyContext(dynasty),
    `Character: ${character.name}, age ${character.age}, year ${character.year} (${epoch.label}), nation: ${character.nation}, class: ${character.classId}, track: ${character.trackId ?? "none yet"}.`,
    `Stats: influence ${character.stats.influence}, skill ${character.stats.skill}, wealth ${character.stats.wealth}, health ${character.stats.health}, popularity ${character.stats.popularity}.`,
  ].join("\n");

  try {
    const resp = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text.trim() : deterministicFallback();
  } catch {
    // AI is flavor, never a hard dependency for advancing a turn.
    return deterministicFallback();
  }
}

// TODO: resolveCustomAction (free-text player input), generateSuitors
// (marriage prospects), writeChronicle/writeEulogy/writeBiography - not
// implemented yet, same gating pattern as generateEvent above should apply
// to each.
