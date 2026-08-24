import { useEffect, useState } from "react";
import type { DynastySave, TreeRecord } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

// Section 3's "family tree" secondary screen. dynasty.people already has
// everything needed to render a generational tree (parentId, generation) -
// this was tracked from the first commit but never surfaced to the player.
export function TreeScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const people = Object.values(save.dynasty.people);
  const currentId = save.dynasty.currentId;

  const byGeneration = new Map<number, TreeRecord[]>();
  for (const r of people) {
    const list = byGeneration.get(r.generation) ?? [];
    list.push(r);
    byGeneration.set(r.generation, list);
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Family Tree</h1>
        {people.length === 0 && <p>The tree is empty.</p>}
        {generations.map((gen) => (
          <div key={gen} style={{ marginBottom: "14px" }}>
            <h2 style={S.h2}>Generation {gen}</h2>
            <div style={S.statRow}>
              {byGeneration
                .get(gen)!
                .sort((a, b) => a.birthYear - b.birthYear)
                .map((r) => (
                  <div key={r.id} style={{ ...S.stat, fontWeight: r.id === currentId ? "bold" : "normal" }}>
                    {r.name}
                    {r.id === currentId ? " (current)" : ""}
                    <div style={{ fontSize: "0.85rem" }}>
                      {r.birthYear}–{r.deathYear ?? "living"}
                      {r.peakTitle ? ` • ${r.peakTitle}` : ""}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
