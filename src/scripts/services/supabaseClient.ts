import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://kahdzslnqoquhuvchefp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGR6c2xucW9xdWh1dmNoZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzEwMDIsImV4cCI6MjA3MzM0NzAwMn0._mdsdX1CT5CX-dWx-CFyuPqaFkOEgj-x8h2IAVs-6E0';

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
  const runtimeConfig = window.WEEKPLAN_CONFIG ?? {};
  const url = envUrl ?? runtimeConfig.supabaseUrl ?? DEFAULT_SUPABASE_URL;
  const key = envKey ?? runtimeConfig.supabaseAnonKey ?? DEFAULT_SUPABASE_ANON_KEY;
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
