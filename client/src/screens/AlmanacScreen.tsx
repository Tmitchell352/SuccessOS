import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

// Section 3's "almanac (named NPCs encountered)" secondary screen.
export function AlmanacScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const almanac = save.dynasty.almanac;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Almanac</h1>
        {almanac.length === 0 && <p>No one of note has been encountered yet.</p>}
        <div style={S.statRow}>
          {almanac.map((name) => (
            <div key={name} style={S.stat}>
              {name}
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
