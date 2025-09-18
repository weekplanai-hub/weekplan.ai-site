// supabase.js — initializes Supabase client (browser)
const SUPABASE_URL = "https://kahdzslnqoquhuvchefp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGR6c2xucW9xdWh1dmNoZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzEwMDIsImV4cCI6MjA3MzM0NzAwMn0._mdsdX1CT5CX-dWx-CFyuPqaFkOEgj-x8h2IAVs-6E0"; // your anon key

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
