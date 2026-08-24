import { useEffect, useState } from "react";
import type { DynastySave, TreeRecord } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

type RecordDef = { label: string; pick: (people: TreeRecord[]) => TreeRecord | null; show: (r: TreeRecord) => string };

const RECORDS: RecordDef[] = [
  {
    label: "Wealthiest",
    pick: (people) => best(people, (r) => r.peakWealth),
    show: (r) => `${r.peakWealth} wealth`,
  },
  {
    label: "Most Influential",
    pick: (people) => best(people, (r) => r.peakInfluence),
    show: (r) => `${r.peakInfluence} influence`,
  },
  {
    label: "Most Skilled",
    pick: (people) => best(people, (r) => r.peakSkill),
    show: (r) => `${r.peakSkill} skill`,
  },
  {
    label: "Most Popular",
    pick: (people) => best(people, (r) => r.peakPopularity),
    show: (r) => `${r.peakPopularity} popularity`,
  },
  {
    label: "Longest-Lived",
    pick: (people) => best(people, (r) => r.age),
    show: (r) => `${r.age} years old`,
  },
  {
    label: "Most Decorated",
    pick: (people) => best(people, (r) => r.achievementCount),
    show: (r) => `${r.achievementCount} achievements`,
  },
];

function best(people: TreeRecord[], key: (r: TreeRecord) => number | undefined): TreeRecord | null {
  let winner: TreeRecord | null = null;
  let winnerValue = -Infinity;
  for (const r of people) {
    const value = key(r);
    if (value === undefined) continue;
    if (value > winnerValue) {
      winner = r;
      winnerValue = value;
    }
  }
  return winner;
}

// Section 3's "records" secondary screen: dynasty-wide superlatives over
// every person ever recorded in dynasty.people, deceased or living. Reuses
// the same peak-stat/achievementCount fields TreeRecord already tracks at
// death (or, for the living current character, whatever's been reached so
// far) - no new engine state needed.
export function RecordsScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;
  const people = Object.values(save.dynasty.people);
  const throneHolders = people.filter((r) => r.heldThrone);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Dynasty Records</h1>
        {people.length === 0 && <p>No one has been recorded yet.</p>}
        {RECORDS.map((rec) => {
          const winner = rec.pick(people);
          if (!winner) return null;
          return (
            <div key={rec.label} style={{ ...S.stat, display: "block", marginBottom: "8px" }}>
              <strong>{rec.label}:</strong> {winner.name} ({rec.show(winner)})
            </div>
          );
        })}
        <div style={{ ...S.stat, display: "block", marginBottom: "8px" }}>
          <strong>Throne Holders:</strong> {throneHolders.length === 0 ? "none yet" : throneHolders.map((r) => r.name).join(", ")}
        </div>
      </div>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
