import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

declare global {
  interface Window {
    WEEKPLAN_CONFIG?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

export type WeekplanSupabase = SupabaseClient<any, 'public', any>;

function resolveConfig(): { url: string; key: string } | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const fallback = window.WEEKPLAN_CONFIG ?? {};
  const url = envUrl ?? fallback.supabaseUrl;
  const key = envKey ?? fallback.supabaseAnonKey;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

let cachedClient: WeekplanSupabase | null = null;

export function getSupabase(): WeekplanSupabase | null {
  if (cachedClient) {
    return cachedClient;
  }
  const config = resolveConfig();
  if (!config) {
    return null;
  }
  cachedClient = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
    },
  });
  return cachedClient;
}

export async function ensureProfile(user: User | null): Promise<void> {
  const client = getSupabase();
  if (!client || !user) {
    return;
  }
  await client.from('profiles').upsert({
    id: user.id,
    email: user.email,
  });
}
