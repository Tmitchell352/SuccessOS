import type { Character, Dynasty, DynastySave } from "@dynasty/shared";
import { supabase } from "./supabase.js";

const API_URL = import.meta.env.VITE_API_URL;

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function listSlots(): Promise<DynastySave[]> {
  const data = await authedFetch("/dynasties");
  return data.slots;
}

export async function createDynasty(params: {
  slotIndex: number;
  epochId: string;
  nation: string;
  characterName?: string;
  motto?: string;
}): Promise<DynastySave> {
  const data = await authedFetch("/dynasties", { method: "POST", body: JSON.stringify(params) });
  return data.slot;
}

export async function getSlot(slotIndex: number): Promise<DynastySave> {
  const data = await authedFetch(`/dynasties/${slotIndex}`);
  return data.slot;
}

export async function advanceTurn(
  slotIndex: number
): Promise<{ character: Character; dynasty: Dynasty; log: string[]; narrative: string | null; died: boolean }> {
  return authedFetch(`/turn/${slotIndex}/advance`, { method: "POST" });
}

export async function chooseHeir(slotIndex: number, childName: string): Promise<{ character: Character; dynasty: Dynasty }> {
  return authedFetch(`/turn/${slotIndex}/choose-heir`, { method: "POST", body: JSON.stringify({ childName }) });
}

export async function resolveMilestone(
  slotIndex: number,
  choiceId: string
): Promise<{ character: Character; dynasty: Dynasty; log: string[]; success: boolean }> {
  return authedFetch(`/turn/${slotIndex}/resolve-milestone`, { method: "POST", body: JSON.stringify({ choiceId }) });
}

// --- Family (Section 8) ---

export type SuitorProspect = {
  name: string;
  trait: "wealthy" | "charming" | "influential" | "humble";
  description: string;
  wealthDelta: number;
  bondStart: number;
};

export async function getSuitors(slotIndex: number): Promise<SuitorProspect[]> {
  const data = await authedFetch(`/family/${slotIndex}/suitors`);
  return data.suitors;
}

type ActionResponse = { character: Character; dynasty: Dynasty; log: string[]; success: boolean };

export async function marry(slotIndex: number, suitor: SuitorProspect, arrangedWithNation?: string): Promise<ActionResponse> {
  return authedFetch(`/family/${slotIndex}/marry`, { method: "POST", body: JSON.stringify({ suitor, arrangedWithNation }) });
}

export type ParentingStyle = "strict" | "permissive" | "educate" | "labor";

export async function applyParenting(slotIndex: number, childName: string, style: ParentingStyle): Promise<ActionResponse> {
  return authedFetch(`/family/${slotIndex}/parenting`, { method: "POST", body: JSON.stringify({ childName, style }) });
}

// --- Geopolitics (Section 6) ---

export async function seizePower(slotIndex: number): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/seize-power`, { method: "POST" });
}

export async function attemptConquest(slotIndex: number, targetNation: string, mode: "absorbed" | "destroyed"): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/conquest`, { method: "POST", body: JSON.stringify({ targetNation, mode }) });
}

export async function forgeAlliance(slotIndex: number, targetNation: string): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/alliance`, { method: "POST", body: JSON.stringify({ targetNation }) });
}

export async function sendEspionage(slotIndex: number, targetNation: string): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/espionage`, { method: "POST", body: JSON.stringify({ targetNation }) });
}

export async function manageIntegration(slotIndex: number, nation: string, action: "pacify" | "suppress"): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/integration`, { method: "POST", body: JSON.stringify({ nation, action }) });
}

export async function convertFaith(slotIndex: number, targetNation: string): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/convert`, { method: "POST", body: JSON.stringify({ targetNation }) });
}

export async function courtFactionSupport(slotIndex: number, faction: string): Promise<ActionResponse> {
  return authedFetch(`/geopolitics/${slotIndex}/court-faction`, { method: "POST", body: JSON.stringify({ faction }) });
}

// --- Economy (Section 7) ---

export async function buyProperty(slotIndex: number, typeId: string): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/buy-property`, { method: "POST", body: JSON.stringify({ typeId }) });
}

export async function takeLoan(slotIndex: number, amount: number): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/loan`, { method: "POST", body: JSON.stringify({ amount }) });
}

export async function repayDebt(slotIndex: number, amount: number): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/repay-debt`, { method: "POST", body: JSON.stringify({ amount }) });
}

export async function attemptVenture(slotIndex: number, stake: number): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/venture`, { method: "POST", body: JSON.stringify({ stake }) });
}

export async function giftToChild(slotIndex: number, childName: string, amount: number): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/gift`, { method: "POST", body: JSON.stringify({ target: "child", childName, amount }) });
}

export async function giftToSpouse(slotIndex: number, amount: number): Promise<ActionResponse> {
  return authedFetch(`/economy/${slotIndex}/gift`, { method: "POST", body: JSON.stringify({ target: "spouse", amount }) });
}
