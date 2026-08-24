import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

// Section 3's "ticker (history)" secondary screen.
export function TickerScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const ticker = save.dynasty.eventTicker;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>History</h1>
        {ticker.length === 0 && <p>Nothing has happened yet.</p>}
        {[...ticker].reverse().map((entry, i) => (
          <div key={i} style={S.logEntry}>
            <strong>{entry.year < 0 ? `${-entry.year} BCE` : `${entry.year} CE`}</strong>: {entry.text}
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
