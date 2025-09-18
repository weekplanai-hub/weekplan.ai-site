// supabase.js — initializes Supabase client (browser)
const SUPABASE_URL = "https://kahdzslnqoquhuvchefp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...6E0"; // your anon key

// Create a global client (so inline scripts can use `sb`)
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optional helper (safe to leave even if you don’t use it yet)
async function ensureProfile(user) {
  if (!user) return;
  await sb.from('profiles').upsert(
    { id: user.id, email: user.email },
    { onConflict: 'id' }
  );
}
