import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.js";
import { LoginScreen } from "./screens/LoginScreen.js";
import { SlotsScreen } from "./screens/SlotsScreen.js";
import { CreateScreen } from "./screens/CreateScreen.js";
import { PlayScreen } from "./screens/PlayScreen.js";
import { GameOverScreen } from "./screens/GameOverScreen.js";
import { S } from "./theme.js";

// Minimal screen router. Matches the original's screen list (Section 3) in
// spirit, but only implements the "golden path" - loading -> login -> slots
// -> create -> play -> gameover -> back to play. The 12+ secondary screens
// (menu, dynastyActions, estate, almanac, records, ticker, tree, codex,
// settings, timeline, chronicle, biography) are not built yet.
type Screen = { name: "slots" } | { name: "create"; slotIndex: number } | { name: "play"; slotIndex: number } | { name: "gameover"; slotIndex: number };

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [screen, setScreen] = useState<Screen>({ name: "slots" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={S.page}>Loading...</div>;
  if (!session) return <LoginScreen onSignedIn={() => {}} />;

  switch (screen.name) {
    case "slots":
      return (
        <SlotsScreen
          onSelectSlot={(slotIndex) => setScreen({ name: "play", slotIndex })}
          onNewDynasty={(slotIndex) => setScreen({ name: "create", slotIndex })}
        />
      );
    case "create":
      return <CreateScreen slotIndex={screen.slotIndex} onCreated={() => setScreen({ name: "play", slotIndex: screen.slotIndex })} />;
    case "play":
      return (
        <PlayScreen
          slotIndex={screen.slotIndex}
          onDied={() => setScreen({ name: "gameover", slotIndex: screen.slotIndex })}
          onBack={() => setScreen({ name: "slots" })}
        />
      );
    case "gameover":
      return <GameOverScreen slotIndex={screen.slotIndex} onHeirChosen={() => setScreen({ name: "play", slotIndex: screen.slotIndex })} />;
  }
}
