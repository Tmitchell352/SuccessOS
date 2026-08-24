import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { advanceTurn, getSlot, resolveMilestone } from "../api.js";
import { S } from "../theme.js";

export function PlayScreen({
  slotIndex,
  onDied,
  onBack,
  onMenu,
}: {
  slotIndex: number;
  onDied: () => void;
  onBack: () => void;
  onMenu: () => void;
}) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  // A dead character sitting in a save slot (e.g. the app was closed right
  // after a death, before an heir was chosen) should route straight to
  // heir selection, not render a play screen for someone who isn't alive.
  useEffect(() => {
    if (save?.character && !save.character.alive) onDied();
  }, [save, onDied]);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const result = await advanceTurn(slotIndex);
      if (result.died) {
        onDied();
        return;
      }
      if (result.victoryAchieved) setVictoryMessage("Victory! The dynasty has achieved its goal.");
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pickMilestoneChoice(choiceId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await resolveMilestone(slotIndex, choiceId);
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const c = save.character;
  if (!c || !c.alive) return <div style={S.page}>{"No living character - choose an heir."}</div>;

  // A branching historical milestone (Section 6) pauses everything else
  // until the player picks a side.
  if (c.pendingMilestone) {
    const m = c.pendingMilestone;
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.h1}>{m.label}</h1>
          <p>{m.description}</p>
          {error && <div style={S.error}>{error}</div>}
          {m.choices.map((choice) => (
            <button key={choice.id} style={{ ...S.button, display: "block", width: "100%", textAlign: "left" }} disabled={busy} onClick={() => pickMilestoneChoice(choice.id)}>
              <strong>{choice.label}</strong>
              <div style={{ fontWeight: "normal", fontSize: "0.9rem" }}>{choice.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
        {victoryMessage && <div style={S.banner}>{victoryMessage}</div>}
        <button style={S.button} onClick={next} disabled={busy}>
          {busy ? "..." : "Advance a Year"}
        </button>
        <button style={S.button} onClick={onMenu}>
          ☰ Menu
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
