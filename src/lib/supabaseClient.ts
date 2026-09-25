import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
// GitHub Pages is a static build; the publishable key is safe to expose in the browser.
const DEFAULT_URL = "https://udersgrrqcdacahietzm.supabase.co";
const DEFAULT_KEY = "sb_publishable_P8kVfImxJDDXOw8nUHBAXw_AKsVANvG";

export function isSupabaseConfigured() {
  return Boolean((import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL) &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY));
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  client = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
