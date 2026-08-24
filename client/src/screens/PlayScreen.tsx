import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { EPOCH_BY_ID, TRACK_SETS } from "@dynasty/shared";
import { advanceTurn, changeCareer, chooseSpecialization, customAction, getSlot, resolveMilestone } from "../api.js";
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
  const [actionText, setActionText] = useState("");
  const [newTrackId, setNewTrackId] = useState<string | null>(null);

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

  async function submitAction() {
    if (!actionText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await customAction(slotIndex, actionText.trim());
      setActionText("");
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

  async function pickSpecialization(specializationId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await chooseSpecialization(slotIndex, specializationId);
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitChangeCareer() {
    if (!newTrackId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await changeCareer(slotIndex, newTrackId);
      setNewTrackId(null);
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
        <div style={{ marginTop: "12px" }}>
          <label>Try something (Section 9's free-text action)</label>
          <input
            style={S.input}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder="e.g. try to bribe the tax collector"
            onKeyDown={(e) => e.key === "Enter" && submitAction()}
          />
          <button style={S.button} onClick={submitAction} disabled={busy || !actionText.trim()}>
            Attempt It
          </button>
        </div>
      </div>
      {c.trackId && c.age >= 18 && (() => {
        const epoch = EPOCH_BY_ID[c.epochId];
        const set = TRACK_SETS[epoch.trackSet];
        const trackDef = set[c.trackId as keyof typeof set];
        const otherTracks = Object.values(set).filter((t) => t.id !== c.trackId);
        const hasSpecialization = !!c.specializations[c.trackId];
        return (
          <div style={S.card}>
            <h2 style={S.h2}>Career: {trackDef.label}</h2>
            {!hasSpecialization && (
              <>
                <p style={{ fontSize: "0.9rem" }}>Choose a specialization - a one-time career perk (Section 5).</p>
                {trackDef.specializations.map((spec) => (
                  <button key={spec.id} style={S.button} disabled={busy} onClick={() => pickSpecialization(spec.id)}>
                    {spec.label} ({Object.entries(spec.statBonus).map(([k, v]) => `+${v} ${k}`).join(", ")})
                  </button>
                ))}
              </>
            )}
            <div style={{ marginTop: "10px" }}>
              <label>Change Career (starts over at tier 0 in the new track)</label>
              <select style={S.select} value={newTrackId ?? ""} onChange={(e) => setNewTrackId(e.target.value)}>
                <option value="" disabled>
                  Choose a track...
                </option>
                {otherTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button style={S.button} disabled={busy || !newTrackId} onClick={submitChangeCareer}>
                Switch Career
              </button>
            </div>
          </div>
        );
      })()}
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
