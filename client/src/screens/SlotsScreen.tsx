import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { listSlots } from "../api.js";
import { S } from "../theme.js";
import { supabase } from "../supabase.js";

export function SlotsScreen({ onSelectSlot, onNewDynasty }: { onSelectSlot: (slotIndex: number) => void; onNewDynasty: (slotIndex: number) => void }) {
  const [slots, setSlots] = useState<DynastySave[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSlots().then(setSlots).catch((e) => setError(e.message));
  }, []);

  const usedSlots = new Set((slots ?? []).map((s) => s.slotIndex));
  const slotIndices = [0, 1, 2, 3, 4];

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Your Dynasties</h1>
        {error && <div style={S.error}>{error}</div>}
        {!slots ? (
          <p>Loading...</p>
        ) : (
          slotIndices.map((idx) => {
            const save = slots.find((s) => s.slotIndex === idx);
            return (
              <div key={idx} style={{ ...S.card, margin: "0 0 10px" }}>
                {save ? (
                  <>
                    <h2 style={S.h2}>{save.name}</h2>
                    <p>
                      {save.character ? `${save.character.name}, age ${save.character.age} (${save.character.year})` : "Between generations"}
                    </p>
                    <button style={S.button} onClick={() => onSelectSlot(idx)}>Continue</button>
                  </>
                ) : (
                  <>
                    <h2 style={S.h2}>Empty Slot {idx + 1}</h2>
                    <button style={S.button} onClick={() => onNewDynasty(idx)}>Found a New Dynasty</button>
                  </>
                )}
              </div>
            );
          })
        )}
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={() => supabase.auth.signOut()}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
