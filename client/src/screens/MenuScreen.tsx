import { S } from "../theme.js";

// Section 3's single Menu hub, added specifically so secondary screens
// don't each grow their own stack of nav buttons. Only the tiles this
// rebuild actually has screens for are wired up; the rest of the original's
// hub (almanac, records, ticker, tree, codex, settings, timeline, chronicle,
// biography) isn't built yet.
export function MenuScreen({
  onFamily,
  onDynastyActions,
  onEstate,
  onBack,
}: {
  onFamily: () => void;
  onDynastyActions: () => void;
  onEstate: () => void;
  onBack: () => void;
}) {
  return (
    <div style={S.page}>
      <div style={{ maxWidth: "560px", margin: "0 auto 16px" }}>
        <h1 style={S.h1}>Menu</h1>
      </div>
      <div style={S.menuGrid}>
        <div style={S.menuTile} onClick={onFamily}>
          Family
        </div>
        <div style={S.menuTile} onClick={onDynastyActions}>
          Dynasty Actions
        </div>
        <div style={S.menuTile} onClick={onEstate}>
          Estate
        </div>
      </div>
      <div style={{ maxWidth: "560px", margin: "16px auto 0" }}>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={onBack}>
          Back to Play
        </button>
      </div>
    </div>
  );
}
