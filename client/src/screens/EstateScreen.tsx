import { useEffect, useState } from "react";
import type { DynastySave } from "@dynasty/shared";
import { PROPERTY_TIERS, computeInheritanceFriction } from "@dynasty/shared";
import {
  attemptVenture,
  buildFamilySeat,
  buyProperty,
  getSlot,
  giftToChild,
  giftToSpouse,
  repayDebt,
  setWillStyle,
  takeLoan,
  type WillStyle,
} from "../api.js";
import { S } from "../theme.js";

const WILL_STYLE_LABELS: Record<WillStyle, string> = {
  default: "No will (default)",
  equal: "Equal shares",
  eldestFavored: "Favor the eldest child",
  youngestFavored: "Favor the youngest child",
};

// Section 3's "estate" secondary screen: property, loans, ventures, and
// gifting (Section 7).
export function EstateScreen({ slotIndex, onBack }: { slotIndex: number; onBack: () => void }) {
  const [save, setSave] = useState<DynastySave | null>(null);
  const [loanAmount, setLoanAmount] = useState("100");
  const [ventureStake, setVentureStake] = useState("50");
  const [giftAmount, setGiftAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSlot(slotIndex).then(setSave).catch((e) => setError(e.message));
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

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Estate</h1>
        {error && <div style={S.error}>{error}</div>}
        {message && <div style={S.banner}>{message}</div>}
        <p>Wealth: {c.stats.wealth}</p>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Property</h2>
        {c.properties.length === 0 && <p>No property owned yet.</p>}
        {c.properties.map((p) => (
          <div key={p.id} style={S.stat}>
            {p.name} (bought {p.boughtYear})
          </div>
        ))}
        <div style={{ marginTop: "10px" }}>
          {PROPERTY_TIERS.map((t) => (
            <button key={t.id} style={S.button} disabled={busy} onClick={() => run(() => buyProperty(slotIndex, t.id))}>
              Buy {t.label} ({t.cost})
            </button>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Debt</h2>
        {c.debt ? (
          <>
            <p>Outstanding: {c.debt.principal}</p>
            <input style={S.input} type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
            <button style={S.button} disabled={busy} onClick={() => run(() => repayDebt(slotIndex, Number(loanAmount)))}>
              Repay
            </button>
          </>
        ) : (
          <>
            <p>No debt.</p>
            <input style={S.input} type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
            <button style={S.button} disabled={busy} onClick={() => run(() => takeLoan(slotIndex, Number(loanAmount)))}>
              Take Loan
            </button>
          </>
        )}
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Risky Venture</h2>
        <input style={S.input} type="number" value={ventureStake} onChange={(e) => setVentureStake(e.target.value)} />
        <button style={S.button} disabled={busy} onClick={() => run(() => attemptVenture(slotIndex, Number(ventureStake)))}>
          Stake It
        </button>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Gifting</h2>
        <input style={S.input} type="number" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} />
        {c.family.status === "married" && (
          <button style={S.button} disabled={busy} onClick={() => run(() => giftToSpouse(slotIndex, Number(giftAmount)))}>
            Gift to {c.family.spouseName}
          </button>
        )}
        {c.family.children
          .filter((child) => child.age < 18)
          .map((child) => (
            <button key={child.name} style={S.button} disabled={busy} onClick={() => run(() => giftToChild(slotIndex, child.name, Number(giftAmount)))}>
              Gift to {child.name}
            </button>
          ))}
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Legacy Planning</h2>
        <p style={{ fontSize: "0.9rem" }}>
          Current inheritance friction: <strong>{Math.round(computeInheritanceFriction(c.willStyle, save.dynasty.familySeat) * 100)}%</strong> - drawing up
          a will and building a family seat both lower it (see the Choose an Heir screen for the exact preview).
        </p>
        <select style={S.select} value={c.willStyle} disabled={busy} onChange={(e) => run(() => setWillStyle(slotIndex, e.target.value as WillStyle))}>
          {(Object.keys(WILL_STYLE_LABELS) as WillStyle[]).map((style) => (
            <option key={style} value={style}>
              {WILL_STYLE_LABELS[style]}
            </option>
          ))}
        </select>
        {save.dynasty.familySeat ? (
          <p>The dynasty already has a family seat.</p>
        ) : (
          <button style={S.button} disabled={busy} onClick={() => run(() => buildFamilySeat(slotIndex))}>
            Build a Family Seat (400)
          </button>
        )}
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
