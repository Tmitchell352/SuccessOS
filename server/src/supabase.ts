import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

// One Supabase client per request, authenticated as the calling user (their
// access token is forwarded, never a service-role key) so every query is
// naturally scoped by the RLS policies on dynasty_saves - the API can't
// accidentally read/write another user's dynasty even if a route has a bug.
export function clientForToken(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Unauthenticated client, for auth.signUp/signInWithPassword only.
export const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
