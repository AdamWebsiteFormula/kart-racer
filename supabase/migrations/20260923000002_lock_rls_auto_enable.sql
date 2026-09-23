-- The automatic-RLS helper runs as an event trigger; nobody needs to call it over the API.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
