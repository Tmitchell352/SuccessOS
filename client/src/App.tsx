import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.js";
import { LoginScreen } from "./screens/LoginScreen.js";
import { SlotsScreen } from "./screens/SlotsScreen.js";
import { CreateScreen } from "./screens/CreateScreen.js";
import { PlayScreen } from "./screens/PlayScreen.js";
import { GameOverScreen } from "./screens/GameOverScreen.js";
import { MenuScreen } from "./screens/MenuScreen.js";
import { FamilyScreen } from "./screens/FamilyScreen.js";
import { DynastyActionsScreen } from "./screens/DynastyActionsScreen.js";
import { EstateScreen } from "./screens/EstateScreen.js";
import { S } from "./theme.js";

// Minimal screen router. Matches the original's screen list (Section 3) in
// spirit: the golden path (loading -> login -> slots -> create -> play ->
// gameover -> back to play) plus the Menu hub with Family, Dynasty Actions,
// and Estate. The rest of the original's secondary screens (almanac,
// records, ticker, tree, codex, settings, timeline, chronicle, biography)
// are not built yet.
type Screen =
  | { name: "slots" }
  | { name: "create"; slotIndex: number }
  | { name: "play"; slotIndex: number }
  | { name: "gameover"; slotIndex: number }
  | { name: "menu"; slotIndex: number }
  | { name: "family"; slotIndex: number }
  | { name: "dynastyActions"; slotIndex: number }
  | { name: "estate"; slotIndex: number };

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
          onMenu={() => setScreen({ name: "menu", slotIndex: screen.slotIndex })}
        />
      );
    case "gameover":
      return <GameOverScreen slotIndex={screen.slotIndex} onHeirChosen={() => setScreen({ name: "play", slotIndex: screen.slotIndex })} />;
    case "menu":
      return (
        <MenuScreen
          onFamily={() => setScreen({ name: "family", slotIndex: screen.slotIndex })}
          onDynastyActions={() => setScreen({ name: "dynastyActions", slotIndex: screen.slotIndex })}
          onEstate={() => setScreen({ name: "estate", slotIndex: screen.slotIndex })}
          onBack={() => setScreen({ name: "play", slotIndex: screen.slotIndex })}
        />
      );
    case "family":
      return <FamilyScreen slotIndex={screen.slotIndex} onBack={() => setScreen({ name: "menu", slotIndex: screen.slotIndex })} />;
    case "dynastyActions":
      return <DynastyActionsScreen slotIndex={screen.slotIndex} onBack={() => setScreen({ name: "menu", slotIndex: screen.slotIndex })} />;
    case "estate":
      return <EstateScreen slotIndex={screen.slotIndex} onBack={() => setScreen({ name: "menu", slotIndex: screen.slotIndex })} />;
  }
}
