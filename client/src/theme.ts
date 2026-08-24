// Shared design tokens, per docs/DYNASTY_HANDOFF.md Section 11: every screen
// reads from this one object instead of inlining its own colors, so a
// palette change is one edit instead of N.

export const A = {
  ink: "#2b2013",
  paper: "#f4ecd8",
  paperRaised: "#fffaf0",
  accent: "#8b5e34",
  accentDark: "#5c3d20",
  border: "#c9b48c",
  danger: "#8c2f1f",
};

export const S = {
  page: {
    minHeight: "100vh",
    background: A.paper,
    color: A.ink,
    fontFamily: "Georgia, 'Times New Roman', serif",
    padding: "24px",
    boxSizing: "border-box" as const,
  },
  card: {
    background: A.paperRaised,
    border: `1px solid ${A.border}`,
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 2px 6px rgba(43,32,19,0.15)",
    maxWidth: "560px",
    margin: "0 auto 16px",
  },
  h1: { fontSize: "1.6rem", margin: "0 0 12px", color: A.accentDark },
  h2: { fontSize: "1.2rem", margin: "0 0 8px", color: A.accentDark },
  button: {
    background: A.accent,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 16px",
    fontSize: "1rem",
    cursor: "pointer",
    marginRight: "8px",
    marginBottom: "8px",
  },
  buttonDanger: {
    background: A.danger,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: `1px solid ${A.border}`,
    borderRadius: "6px",
    boxSizing: "border-box" as const,
  },
  statRow: { display: "flex", gap: "12px", flexWrap: "wrap" as const, marginBottom: "12px" },
  stat: { background: A.paper, border: `1px solid ${A.border}`, borderRadius: "6px", padding: "6px 10px" },
  error: { color: A.danger, marginBottom: "10px" },
  logEntry: { borderBottom: `1px solid ${A.border}`, padding: "6px 0", fontSize: "0.95rem" },
};
