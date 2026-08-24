import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { chooseHeir, getSlot } from "../api.js";
import { S } from "../theme.js";

export function GameOverScreen({ slotIndex, onHeirChosen }: { slotIndex: number; onHeirChosen: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  if (!save?.character) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const c = save.character;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>{c.name} has died</h1>
        <p>
          Aged {c.age}, of {c.deathCause}, in the year {c.year}.
        </p>
        {error && <div style={S.error}>{error}</div>}
        <h2 style={S.h2}>Choose an Heir</h2>
        {c.family.children.length === 0 ? (
          <p>No children survive to inherit - this dynasty has ended.</p>
        ) : (
          c.family.children.map((child) => (
            <button key={child.name} style={S.button} onClick={() => pick(child.name)} disabled={busy}>
              {child.name} (age {child.age})
            </button>
          ))
        )}
      </div>
    </div>
  );
}
