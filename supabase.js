// supabase.js — initializes Supabase client

const SUPABASE_URL = "https://kahdzslnqoquhuvchefp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaGR6c2xucW9xdWh1dmNoZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzEwMDIsImV4cCI6MjA3MzM0NzAwMn0._mdsdX1CT5CX-dWx-CFyuPqaFkOEgj-x8h2IAVs-6E0"; // paste full anon key

// Create global client
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ensure profile exists in 'profiles' table
async function ensureProfile(user) {
  if (!user) return;
  await sb.from('profiles').upsert(
    { id: user.id, email: user.email },
    { onConflict: 'id' }
  );
}
