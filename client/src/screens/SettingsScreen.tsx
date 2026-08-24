import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { getSlot, updateSettings } from "../api.js";
import { S } from "../theme.js";

// Section 3's "settings" secondary screen. Most of what a player might
// expect to configure (difficulty, tone, tradition, victory goal) is locked
// in at dynasty founding and shown here read-only rather than duplicated as
// editable state nothing in the engine actually re-reads mid-game. The one
// thing that genuinely was configurable but had no way to set it - noAiMode
// ("player opt-out of AI-generated story turns", on Dynasty since the first
// commit) - is a real toggle.
export function SettingsScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  async function toggleNoAiMode() {
    if (!save) return;
    setBusy(true);
    setError(null);
    try {
      const next = !save.dynasty.noAiMode;
      const result = await updateSettings(slotIndex, next);
      setSave((prev) => (prev ? { ...prev, dynasty: result.dynasty } : prev));
      setMessage(next ? "AI narration turned off - turns will use the deterministic fallback text." : "AI narration turned on.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const d = save.dynasty;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Settings</h1>
        {error && <div style={S.error}>{error}</div>}
        {message && <div style={S.banner}>{message}</div>}
        <p>
          <strong>{d.noAiMode ? "AI narration is off." : "AI narration is on."}</strong>{" "}
          {d.noAiMode ? "Turns use the deterministic fallback narrative instead of calling the AI." : "Turns call the AI for a narrative beat when a key is configured."}
        </p>
        <button style={S.button} disabled={busy} onClick={toggleNoAiMode}>
          {d.noAiMode ? "Turn AI Narration On" : "Turn AI Narration Off"}
        </button>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Dynasty</h2>
        <div style={S.statRow}>
          <div style={S.stat}>Motto: {d.motto}</div>
          <div style={S.stat}>Difficulty: {d.difficulty}</div>
          <div style={S.stat}>Tone: {d.tone}</div>
          <div style={S.stat}>Tradition: {d.tradition}</div>
          <div style={S.stat}>Victory goal: {d.victoryGoal}</div>
        </div>
        <p style={{ fontSize: "0.85rem" }}>These were chosen when the dynasty was founded and can't be changed mid-game.</p>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
