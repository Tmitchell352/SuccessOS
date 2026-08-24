import type { Character, Dynasty } from "@dynasty/shared";

// The single choke point every save/load path routes through. Per
// docs/DYNASTY_HANDOFF.md Section 10, the original project's worst recurring
// bug was a new Dynasty field being wired into live game logic but forgotten
// in one of three separate round-trip paths (persist / openSlot /
// importSaveFile), so it silently vanished on reload.
//
// Structural fix: there is exactly one shape (the `Dynasty` TypeScript type)
// and exactly one serialize/deserialize pair. `dynasty_saves.dynasty` in
// Postgres is a single JSONB column, not per-field relational columns, so
// there is no second or third place to remember to update - every route
// (create, save-turn, load-slot, export) calls these two functions and
// nothing else touches the JSON shape directly.

export function serializeDynasty(dynasty: Dynasty): Record<string, unknown> {
  // JSON.parse(JSON.stringify(...)) round-trip guarantees what we store is
  // exactly what a fresh `deserializeDynasty` will hand back - no class
  // instances, no undefined-vs-missing-key ambiguity.
  return JSON.parse(JSON.stringify(dynasty));
}

export function deserializeDynasty(json: unknown): Dynasty {
  // Structural trust boundary: this cast is intentionally the ONLY place in
  // the codebase allowed to assert `unknown` into `Dynasty`. If new fields
  // are added to the type, TypeScript will flag every construction site
  // (createDynasty, tests, etc.) that doesn't yet supply them - that's the
  // enforcement mechanism replacing the original's "remember three places."
  return json as Dynasty;
}

export function serializeCharacter(character: Character | null): Record<string, unknown> | null {
  return character ? JSON.parse(JSON.stringify(character)) : null;
}

export function deserializeCharacter(json: unknown): Character | null {
  return (json as Character | null) ?? null;
}
