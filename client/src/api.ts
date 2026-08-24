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
