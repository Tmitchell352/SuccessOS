import { useState } from "react";
import { EPOCHS } from "@dynasty/shared";
import { createDynasty } from "../api.js";
import { S } from "../theme.js";

export function CreateScreen({ slotIndex, onCreated }: { slotIndex: number; onCreated: () => void }) {
  const [epochId, setEpochId] = useState(EPOCHS[0].id);
  const [nation, setNation] = useState(EPOCHS[0].nations[0]);
  const [characterName, setCharacterName] = useState("");
  const [motto, setMotto] = useState("");
  const [victoryGoal, setVictoryGoal] = useState<"none" | "gen10" | "legacy300" | "legacy750">("none");
  const [tradition, setTradition] = useState<"none" | "military" | "scholarly" | "mercantile" | "political" | "devout">("none");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const epoch = EPOCHS.find((e) => e.id === epochId)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createDynasty({ slotIndex, epochId, nation, characterName: characterName || undefined, motto: motto || undefined, victoryGoal, tradition });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Found a Dynasty</h1>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={submit}>
          <label>Epoch</label>
          <select
            style={S.input}
            value={epochId}
            onChange={(e) => {
              const next = EPOCHS.find((ep) => ep.id === e.target.value)!;
              setEpochId(next.id);
              setNation(next.nations[0]);
            }}
          >
            {EPOCHS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} ({e.year < 0 ? `${-e.year} BCE` : `${e.year} CE`})
              </option>
            ))}
          </select>

          <label>Nation</label>
          <select style={S.input} value={nation} onChange={(e) => setNation(e.target.value)}>
            {epoch.nations.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <label>Character Name (optional)</label>
          <input style={S.input} value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="Leave blank for a random name" />

          <label>Dynasty Motto (optional)</label>
          <input style={S.input} value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="House of..." />

          <label>Victory Goal (optional)</label>
          <select style={S.input} value={victoryGoal} onChange={(e) => setVictoryGoal(e.target.value as typeof victoryGoal)}>
            <option value="none">None - play freely</option>
            <option value="gen10">Reach the 10th generation</option>
            <option value="legacy300">Amass 300 legacy points</option>
            <option value="legacy750">Amass 750 legacy points</option>
          </select>

          <label>Family Tradition (optional, permanent bonus for descendants in a matching career)</label>
          <select style={S.input} value={tradition} onChange={(e) => setTradition(e.target.value as typeof tradition)}>
            <option value="none">None</option>
            <option value="military">Military - bonus skill in the Military track</option>
            <option value="scholarly">Scholarly - bonus skill in the Academic track</option>
            <option value="mercantile">Mercantile - bonus wealth in the Commercial track</option>
            <option value="political">Political - bonus influence in the Political track</option>
            <option value="devout">Devout - bonus popularity in the Religious track</option>
          </select>

          <button style={S.button} type="submit" disabled={busy}>
            Begin
          </button>
        </form>
      </div>
    </div>
  );
}
