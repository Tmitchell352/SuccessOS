import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { COURT_FACTIONS } from "@dynasty/shared";
import { EPOCH_BY_ID } from "@dynasty/shared";
import {
  attemptConquest,
  convertFaith,
  courtFactionSupport,
  forgeAlliance,
  getSlot,
  manageIntegration,
  seizePower,
  sendEspionage,
} from "../api.js";
import { S } from "../theme.js";

export function DynastyActionsScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [targetNation, setTargetNation] = useState("");
  const [conquestMode, setConquestMode] = useState<"absorbed" | "destroyed">("absorbed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then((s) => {
      setSave(s);
      const epoch = s.character ? EPOCH_BY_ID[s.character.epochId] : null;
      const first = epoch?.nations.find((n) => n !== s.character?.nation);
      if (first) setTargetNation(first);
    }).catch((e) => setError(e.message));
  }, [slotIndex]);

  async function run(action: () => Promise<{ log: string[]; character: DynastySave["character"]; dynasty: DynastySave["dynasty"] }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      setMessage(result.log.join(" "));
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!save?.character) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const c = save.character;
  const dynasty = save.dynasty;
  const epoch = EPOCH_BY_ID[c.epochId];
  const otherNations = epoch.nations.filter((n) => n !== c.nation);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Dynasty Actions</h1>
        {error && <div style={S.error}>{error}</div>}
        {message && <div style={S.banner}>{message}</div>}

        <p>Nation power: {dynasty.nationPower} &middot; Legacy points: {dynasty.legacyPoints}</p>

        <label>Target nation</label>
        <select style={S.select} value={targetNation} onChange={(e) => setTargetNation(e.target.value)}>
          {otherNations.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <button style={S.button} disabled={busy} onClick={() => run(() => forgeAlliance(slotIndex, targetNation))}>
          Forge Alliance
        </button>
        <button style={S.button} disabled={busy} onClick={() => run(() => sendEspionage(slotIndex, targetNation))}>
          Send Spies (20 legacy points)
        </button>
        <button style={S.button} disabled={busy} onClick={() => run(() => convertFaith(slotIndex, targetNation))}>
          Convert to Their Ways
        </button>

        <div style={{ marginTop: "10px" }}>
          <select style={S.select} value={conquestMode} onChange={(e) => setConquestMode(e.target.value as "absorbed" | "destroyed")}>
            <option value="absorbed">Absorb</option>
            <option value="destroyed">Destroy</option>
          </select>
          <button style={S.button} disabled={busy} onClick={() => run(() => attemptConquest(slotIndex, targetNation, conquestMode))}>
            Attempt Conquest (military, top rank only)
          </button>
        </div>

        <button style={{ ...S.button, ...S.buttonDanger }} disabled={busy} onClick={() => run(() => seizePower(slotIndex))}>
          Seize Power (non-political, top rank only)
        </button>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Court Factions</h2>
        {COURT_FACTIONS.map((f) => (
          <div key={f} style={{ marginBottom: "8px" }}>
            {f}: {c.factionStanding[f]}{" "}
            <button style={S.button} disabled={busy} onClick={() => run(() => courtFactionSupport(slotIndex, f))}>
              Support
            </button>
          </div>
        ))}
      </div>

      {dynasty.conqueredNations.length > 0 && (
        <div style={S.card}>
          <h2 style={S.h2}>Conquered Territories</h2>
          {dynasty.conqueredNations.map((cn) => (
            <div key={cn.nation} style={{ marginBottom: "8px" }}>
              {cn.nation} ({cn.mode}) - integration: {cn.integration}{" "}
              <button style={S.button} disabled={busy} onClick={() => run(() => manageIntegration(slotIndex, cn.nation, "pacify"))}>
                Pacify
              </button>
              <button style={S.button} disabled={busy} onClick={() => run(() => manageIntegration(slotIndex, cn.nation, "suppress"))}>
                Suppress
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
