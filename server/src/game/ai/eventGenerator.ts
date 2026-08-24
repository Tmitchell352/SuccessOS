import Anthropic from "@anthropic-ai/sdk";
import type { Character, Dynasty, TreeRecord } from "@dynasty/shared";
import { EPOCH_BY_ID } from "@dynasty/shared";
import { config } from "../../config.js";
import { generateSuitorProspects, type SuitorProspect } from "../engine/family.js";

// Per docs/DYNASTY_HANDOFF.md Section 9: "Only 4 things call the AI" -
// generateEvent, resolveCustomAction, generateSuitors, and the on-demand
// narrative generators (chronicle/eulogy/biography), all in this file now.
// Everything else in the turn structure is deterministic (see
// ./engine/turn.ts).
//
// The API key lives ONLY in server env (see .env.example) and is never sent
// to the client. If it's unset, or the dynasty has noAiMode on, every call
// here falls back to something deterministic instead of throwing - the
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

async function askText(prompt: string, maxTokens: number): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    const resp = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text.trim() : null;
  } catch {
    return null;
  }
}

export async function generateEvent(character: Character, dynasty: Dynasty): Promise<string> {
  if (dynasty.noAiMode) return deterministicFallback();
  const epoch = EPOCH_BY_ID[character.epochId];
  const prompt = [
    `You are the narrator of a multi-generational life-simulation game called Dynasty.`,
    `Write ONE short (2-3 sentence) narrative beat for this character's current year. No choices, no options - just what happened.`,
    dynastyContext(dynasty),
    `Character: ${character.name}, age ${character.age}, year ${character.year} (${epoch.label}), nation: ${character.nation}, class: ${character.classId}, track: ${character.trackId ?? "none yet"}.`,
    `Stats: influence ${character.stats.influence}, skill ${character.stats.skill}, wealth ${character.stats.wealth}, health ${character.stats.health}, popularity ${character.stats.popularity}.`,
  ].join("\n");
  const text = await askText(prompt, 200);
  return text ?? deterministicFallback();
}

// AI-generated marriage prospects (Section 8: "either AI-generated named
// suitors ... or a deterministic fallback"). Falls back to family.ts's
// generateSuitorProspects (the deterministic path) when no key / noAiMode /
// the AI response doesn't parse - a marriage prospect list is exactly the
// kind of thing that must never come back empty or malformed.
export async function generateSuitors(character: Character, dynasty: Dynasty): Promise<SuitorProspect[]> {
  if (dynasty.noAiMode) return generateSuitorProspects(character);
  const epoch = EPOCH_BY_ID[character.epochId];
  const prompt = [
    `You are generating three marriage prospects for a character in a life-simulation game called Dynasty.`,
    `Character: ${character.name}, age ${character.age}, ${character.nation}, class ${character.classId}, epoch: ${epoch.label}.`,
    `Respond with ONLY a JSON array of exactly 3 objects, no prose, no markdown fences. Each object: {"name": string (a period-appropriate full name), "trait": one of "wealthy"|"charming"|"influential"|"humble", "description": string (one short clause describing them), "wealthDelta": integer between -20 and 90 (a dowry, can be negative), "bondStart": integer between 20 and 85}.`,
  ].join("\n");
  const text = await askText(prompt, 400);
  if (!text) return generateSuitorProspects(character);
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
    if (!Array.isArray(parsed) || parsed.length === 0) return generateSuitorProspects(character);
    const validTraits = new Set(["wealthy", "charming", "influential", "humble"]);
    const clean: SuitorProspect[] = parsed.slice(0, 3).map((p: Record<string, unknown>) => ({
      name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : "A Stranger",
      trait: validTraits.has(p.trait as string) ? (p.trait as SuitorProspect["trait"]) : "humble",
      description: typeof p.description === "string" && p.description.trim() ? p.description.trim() : "is an unremarkable match",
      wealthDelta: Math.max(-20, Math.min(90, Math.round(Number(p.wealthDelta) || 0))),
      bondStart: Math.max(20, Math.min(85, Math.round(Number(p.bondStart) || 50))),
    }));
    return clean.length ? clean : generateSuitorProspects(character);
  } catch {
    return generateSuitorProspects(character);
  }
}

export type CustomActionResult = { narrative: string; statDelta: Partial<Character["stats"]> };
const STAT_KEYS = ["influence", "skill", "wealth", "health", "popularity"] as const;

// Free-text player input (Section 9), one of the 4 AI call sites. The AI's
// job is to narrate an outcome AND propose small stat effects - but its
// output is never trusted directly. Every delta is clamped server-side
// regardless of what the model returns, and a malformed/missing response
// just narrates nothing happening rather than failing the request.
export async function resolveCustomAction(character: Character, dynasty: Dynasty, actionText: string): Promise<CustomActionResult> {
  const fallback: CustomActionResult = { narrative: `${character.name} considered it, but nothing much came of it.`, statDelta: {} };
  if (dynasty.noAiMode) return fallback;
  const epoch = EPOCH_BY_ID[character.epochId];
  const prompt = [
    `You are the narrator of a life-simulation game called Dynasty. The player has typed a free-text action for their character to attempt.`,
    dynastyContext(dynasty),
    `Character: ${character.name}, age ${character.age}, year ${character.year} (${epoch.label}), nation: ${character.nation}, class: ${character.classId}, track: ${character.trackId ?? "none yet"}.`,
    `Stats: influence ${character.stats.influence}, skill ${character.stats.skill}, wealth ${character.stats.wealth}, health ${character.stats.health}, popularity ${character.stats.popularity}.`,
    `Player's attempted action: "${actionText.slice(0, 300)}"`,
    `Judge plausibility for this character's era and situation - implausible or anachronistic actions should mostly fail or backfire. Respond with ONLY JSON, no prose, no markdown fences: {"narrative": string (2-3 sentences, what actually happened), "statDelta": {"influence": integer -15..15, "skill": integer -15..15, "wealth": integer -60..60, "health": integer -20..20, "popularity": integer -15..15}} - omit any stat that doesn't change.`,
  ].join("\n");
  const text = await askText(prompt, 400);
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
    const narrative = typeof parsed.narrative === "string" && parsed.narrative.trim() ? parsed.narrative.trim() : fallback.narrative;
    const rawDelta = (parsed.statDelta ?? {}) as Record<string, unknown>;
    const bounds: Record<(typeof STAT_KEYS)[number], number> = { influence: 15, skill: 15, wealth: 60, health: 20, popularity: 15 };
    const statDelta: Partial<Character["stats"]> = {};
    for (const key of STAT_KEYS) {
      const n = Number(rawDelta[key]);
      if (Number.isFinite(n) && n !== 0) statDelta[key] = Math.max(-bounds[key], Math.min(bounds[key], Math.round(n)));
    }
    return { narrative, statDelta };
  } catch {
    return fallback;
  }
}

// On-demand narrative generators (Section 9). Results are cached on the
// dynasty (Dynasty.biographies / Dynasty.chronicleText, both unused since
// the first commit) so repeat views don't re-spend an API call.

export async function writeEulogy(character: Character, dynasty: Dynasty): Promise<string> {
  const fallback = `${character.name} lived to ${character.age} and passed into memory, of ${character.deathCause ?? "unknown causes"}, in the year ${character.year}.`;
  if (dynasty.noAiMode) return fallback;
  const prompt = [
    `Write a short, dignified eulogy (3-4 sentences) for a character who just died in a life-simulation game called Dynasty. No headers, just the eulogy text.`,
    dynastyContext(dynasty),
    `${character.name}, died aged ${character.age} of ${character.deathCause ?? "unknown causes"}, year ${character.year}, nation: ${character.nation}, track: ${character.trackId ?? "none"}.`,
    `Peak stats: influence ${character.stats.influence}, skill ${character.stats.skill}, wealth ${character.stats.wealth}, popularity ${character.stats.popularity}.`,
    character.achievements.length ? `Achievements: ${character.achievements.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const text = await askText(prompt, 300);
  return text ?? fallback;
}

export async function writeChronicle(dynasty: Dynasty): Promise<string> {
  const fallback = `The house of "${dynasty.motto}" endures, its story still being written.`;
  if (dynasty.noAiMode) return fallback;
  const deceased = Object.values(dynasty.people).filter((p: TreeRecord) => p.deathYear !== null);
  const prompt = [
    `Write a short retrospective chronicle (4-6 sentences) summarizing a dynasty's history so far in a life-simulation game called Dynasty. No headers, just the chronicle text.`,
    `Dynasty motto: "${dynasty.motto}". Generations so far: ${Object.keys(dynasty.people).length}. Nation power: ${dynasty.nationPower}/100. Legacy points: ${dynasty.legacyPoints}.`,
    dynasty.conqueredNations.length ? `Conquered nations: ${dynasty.conqueredNations.map((n) => `${n.nation} (${n.mode})`).join(", ")}.` : "",
    deceased.length ? `Notable ancestors: ${deceased.slice(-5).map((p: TreeRecord) => `${p.name} (${p.classId}, died ${p.cause ?? "unknown causes"})`).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const text = await askText(prompt, 400);
  return text ?? fallback;
}
