// Public connection details for the leaderboard. Both values are public by design: the URL is the
// project address, and the anon key only reaches what RLS and the grants allow (two read
// functions and the submit-score function). The service-role key never leaves the Edge Function.
export const SUPABASE_URL = 'https://thuvqdejckcphwuooyhx.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXZxZGVqY2tjcGh3dW9veWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzUyNTEsImV4cCI6MjEwNTc1MTI1MX0.rcnZPK6X_p_-n0Q1xDYcJ7eVpEtNmdjNaFE2hrhrBts';
