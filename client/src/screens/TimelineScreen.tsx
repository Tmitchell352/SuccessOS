import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { getSlot } from "../api.js";
import { S } from "../theme.js";

type TimelineEntry = { year: number; text: string };

// Section 3's "timeline" secondary screen - distinct from History (which is
// just dynasty.eventTicker's world/milestone events): this merges that same
// ticker with every recorded person's birth and death, sorted together into
// one chronological narrative of the dynasty's entire span, world and
// family side by side, rather than two things the player has to mentally
// cross-reference themselves.
export function TimelineScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
  }, [slotIndex]);

  if (!save) return <div style={S.page}>{error ? <div style={S.error}>{error}</div> : <p>Loading...</p>}</div>;

  const entries: TimelineEntry[] = [];
  for (const entry of save.dynasty.eventTicker) entries.push({ year: entry.year, text: entry.text });
  for (const person of Object.values(save.dynasty.people)) {
    entries.push({ year: person.birthYear, text: `${person.name} was born (Generation ${person.generation}).` });
    if (person.deathYear !== null) {
      const cause = person.cause ? `, of ${person.cause}` : "";
      const title = person.peakTitle ? `, having risen to ${person.peakTitle}` : "";
      entries.push({ year: person.deathYear, text: `${person.name} died${cause}${title}.` });
    }
  }
  entries.sort((a, b) => a.year - b.year);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Timeline</h1>
        {entries.length === 0 && <p>The dynasty's story hasn't begun yet.</p>}
        {entries.map((entry, i) => (
          <div key={i} style={S.logEntry}>
            <strong>{entry.year < 0 ? `${-entry.year} BCE` : `${entry.year} CE`}</strong>: {entry.text}
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
