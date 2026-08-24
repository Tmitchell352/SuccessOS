import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { EPOCH_BY_ID } from "@dynasty/shared";
import { applyParenting, getSlot, getSuitors, marry, type ParentingStyle, type SuitorProspect } from "../api.js";
import { S } from "../theme.js";

const PARENTING_STYLES: { style: ParentingStyle; label: string }[] = [
  { style: "strict", label: "Raise Strictly" },
  { style: "permissive", label: "Raise Permissively" },
  { style: "educate", label: "Focus on Education" },
  { style: "labor", label: "Put to Work" },
];

export function FamilyScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [suitors, setSuitors] = useState<SuitorProspect[] | null>(null);
  const [arrangedNation, setArrangedNation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  async function loadSuitors() {
    setBusy(true);
    setError(null);
    try {
      setSuitors(await getSuitors(slotIndex));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doMarry(suitor: SuitorProspect) {
    setBusy(true);
    setError(null);
    try {
      const result = await marry(slotIndex, suitor, arrangedNation || undefined);
      setMessage(result.log.join(" "));
      setSuitors(null);
      setSave((prev) => (prev ? { ...prev, character: result.character, dynasty: result.dynasty } : prev));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doParenting(childName: string, style: ParentingStyle) {
    setBusy(true);
    setError(null);
    try {
      const result = await applyParenting(slotIndex, childName, style);
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
  const epoch = EPOCH_BY_ID[c.epochId];
  const otherNations = epoch.nations.filter((n) => n !== c.nation);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Family</h1>
        {error && <div style={S.error}>{error}</div>}
        {message && <div style={S.banner}>{message}</div>}

        {c.family.status === "married" ? (
          <p>
            Married to <strong>{c.family.spouseName}</strong> (age {c.family.spouseAge}, bond {c.family.spouseBond}).
          </p>
        ) : (
          <>
            <p>Single.</p>
            {!suitors ? (
              <button style={S.button} onClick={loadSuitors} disabled={busy}>
                Find Suitors
              </button>
            ) : (
              <>
                <label>Arrange as an alliance with (optional)</label>
                <select style={S.select} value={arrangedNation} onChange={(e) => setArrangedNation(e.target.value)}>
                  <option value="">None</option>
                  {otherNations.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {suitors.map((s) => (
                  <div key={s.name} style={{ ...S.card, margin: "0 0 10px" }}>
                    <h2 style={S.h2}>
                      {s.name} <em>({s.trait})</em>
                    </h2>
                    <p>{s.description}</p>
                    <p>
                      Dowry: {s.wealthDelta >= 0 ? "+" : ""}
                      {s.wealthDelta} wealth &middot; Starting bond: {s.bondStart}
                    </p>
                    <button style={S.button} onClick={() => doMarry(s)} disabled={busy}>
                      Marry {s.name}
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Children</h2>
        {c.family.children.length === 0 && <p>No children yet.</p>}
        {c.family.children.map((child) => (
          <div key={child.name} style={{ ...S.card, margin: "0 0 10px" }}>
            <h2 style={S.h2}>
              {child.name} (age {child.age})
            </h2>
            {child.traits.length > 0 && <p>Traits: {child.traits.join(", ")}</p>}
            {child.age < 18 ? (
              <>
                <p>Parenting so far: {child.parenting.length ? child.parenting.join(", ") : "none"}</p>
                {PARENTING_STYLES.map(({ style, label }) => (
                  <button key={style} style={S.button} onClick={() => doParenting(child.name, style)} disabled={busy}>
                    {label}
                  </button>
                ))}
              </>
            ) : (
              <p>An adult now.</p>
            )}
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
