import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { advanceTurn, getSlot } from "../api.js";
import { S } from "../theme.js";

export function PlayScreen({ slotIndex, onDied, onBack }: { slotIndex: number; onDied: () => void; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const result = await advanceTurn(slotIndex);
      if (result.died) {
        onDied();
        return;
      }
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const c = save.character;
  if (!c) return <div style={S.page}>{"No living character - choose an heir."}</div>;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>{c.name}</h1>
        <p>
          Age {c.age} &middot; Year {c.year} &middot; {c.nation} &middot; {c.classId}
          {c.trackId ? ` • ${c.trackId}` : ""}
        </p>
        <div style={S.statRow}>
          <div style={S.stat}>Influence {c.stats.influence}</div>
          <div style={S.stat}>Skill {c.stats.skill}</div>
          <div style={S.stat}>Wealth {c.stats.wealth}</div>
          <div style={S.stat}>Health {c.stats.health}</div>
          <div style={S.stat}>Popularity {c.stats.popularity}</div>
        </div>
        {error && <div style={S.error}>{error}</div>}
        <button style={S.button} onClick={next} disabled={busy}>
          {busy ? "..." : "Advance a Year"}
        </button>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Slots
        </button>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Life So Far</h2>
        {[...c.log].reverse().map((entry, i) => (
          <div key={i} style={S.logEntry}>
            <strong>
              Age {entry.age} ({entry.year})
            </strong>
            : {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
