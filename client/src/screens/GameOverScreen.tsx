import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { computeInheritanceFriction } from "@dynasty/shared";
import { chooseHeir, getChronicle, getEulogy, getSlot } from "../api.js";
import { S } from "../theme.js";
import { AdSlot } from "../components/AdSlot.js";

export function GameOverScreen({ slotIndex, onHeirChosen }: { slotIndex: number; onHeirChosen: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eulogy, setEulogy] = useState<string | null>(null);
  const [chronicle, setChronicle] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  async function pick(childName: string) {
    setBusy(true);
    setError(null);
    try {
      await chooseHeir(slotIndex, childName);
      onHeirChosen();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadEulogy() {
    setError(null);
    try {
      setEulogy(await getEulogy(slotIndex));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function loadChronicle() {
    setError(null);
    try {
      setChronicle(await getChronicle(slotIndex));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!save?.character) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const c = save.character;

  // Preview the same inheritance-friction cut the server will apply in
  // choose-heir, so the player sees the cost of their will-planning choices
  // before picking an heir, not after.
  const friction = computeInheritanceFriction(c.willStyle, save.dynasty.familySeat);
  const inheritedWealth = Math.round(c.stats.wealth * (1 - friction));

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>{c.name} has died</h1>
        <p>
          Aged {c.age}, of {c.deathCause}, in the year {c.year}.
        </p>
        {error && <div style={S.error}>{error}</div>}
        {eulogy ? (
          <p style={{ fontStyle: "italic" }}>{eulogy}</p>
        ) : (
          <button style={S.button} onClick={loadEulogy}>
            Read Eulogy
          </button>
        )}
        {chronicle ? (
          <p style={{ fontStyle: "italic" }}>{chronicle}</p>
        ) : (
          <button style={S.button} onClick={loadChronicle}>
            View Dynasty Chronicle
          </button>
        )}
        <h2 style={S.h2}>Choose an Heir</h2>
        {c.family.children.length === 0 ? (
          <p>No children survive to inherit - this dynasty has ended.</p>
        ) : (
          <>
            <p style={{ fontSize: "0.9rem" }}>
              The estate carries {c.stats.wealth} wealth. {c.willStyle === "default" ? "With no will drawn up" : "With a will drawn up"}
              {save.dynasty.familySeat ? " and a family seat" : ""}, inheritance friction will take {Math.round(friction * 100)}% -
              the chosen heir inherits roughly <strong>{inheritedWealth}</strong> wealth (plus anything gifted to them directly).
            </p>
            {c.family.children.map((child) => (
              <button key={child.name} style={S.button} onClick={() => pick(child.name)} disabled={busy}>
                {child.name} (age {child.age}, inherits ~{inheritedWealth + Math.round(child.giftedWealth)} wealth)
              </button>
            ))}
          </>
        )}
      </div>
      <AdSlot label="gameover-screen" />
    </div>
  );
}
