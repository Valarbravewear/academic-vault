const SUPABASE_URL =
  "https://zomzsootosbwmwzcwnmg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_gmBGN84eSR6_ERVRz6Uukw_r_73AWjK";

window.academicVaultSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );