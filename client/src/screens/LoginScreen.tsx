import { useState } from "react";
import { supabase } from "../supabase.js";
import { S } from "../theme.js";

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = mode === "signIn"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSignedIn();
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Dynasty</h1>
        <p>A multi-generational life simulator.</p>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={submit}>
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button style={S.button} type="submit" disabled={busy}>
            {mode === "signIn" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <button style={{ ...S.button, background: "transparent", color: "#5c3d20" }} onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
