-- A public, harmless ping so the client UI can prove "the backend is alive"
-- without crossing RLS or leaking any data. SECURITY INVOKER, no side effects.
create or replace function public.ping()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'pong'::text $$;

revoke execute on function public.ping() from public;
grant  execute on function public.ping() to anon, authenticated;
