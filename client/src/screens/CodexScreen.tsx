import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { ACHIEVEMENT_DEFS } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

// Section 3's "codex (achievements)" secondary screen.
export function CodexScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const dynasty = save.dynasty;
  const unlocked = new Set(dynasty.everUnlockedAchievements);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Codex</h1>
        <p>
          Legacy points: {dynasty.legacyPoints} &middot; Victory goal: {dynasty.victoryGoal}
          {dynasty.victoryAchieved ? " (achieved!)" : ""}
        </p>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>Achievements ({unlocked.size}/{ACHIEVEMENT_DEFS.length})</h2>
        {ACHIEVEMENT_DEFS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          if (a.hidden && !isUnlocked) return null;
          return (
            <div key={a.id} style={{ ...S.stat, display: "block", marginBottom: "8px", opacity: isUnlocked ? 1 : 0.5 }}>
              <strong>{isUnlocked ? "✓" : "–"} {a.label}</strong>
              <div style={{ fontSize: "0.9rem" }}>{a.description}</div>
            </div>
          );
        })}
      </div>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
