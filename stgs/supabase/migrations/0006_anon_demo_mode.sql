-- 0006: Demo-mode RLS overlay.
-- Grants the anon role permissive access on every public table so the
-- browser anon key can talk to Postgres without a Supabase auth session.
-- Production RLS (0002_rls.sql) is left in place; anon-friendly policies
-- are added as additional permissive policies (they OR together).
--
-- This is intentionally NOT production-safe — it exists so the localStorage
-- "pick a user" login flow can continue to work while reads/writes go via
-- Supabase. Revoke or replace this migration before any non-demo deploy.

grant usage on schema public to anon;
grant select, insert, update on all tables in schema public to anon;
grant usage on all sequences in schema public to anon;

do $$
declare
  rec record;
begin
  for rec in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('drop policy if exists anon_demo_select on public.%I', rec.tablename);
    execute format('create policy anon_demo_select on public.%I for select to anon using (true)', rec.tablename);

    execute format('drop policy if exists anon_demo_insert on public.%I', rec.tablename);
    execute format('create policy anon_demo_insert on public.%I for insert to anon with check (true)', rec.tablename);

    execute format('drop policy if exists anon_demo_update on public.%I', rec.tablename);
    execute format('create policy anon_demo_update on public.%I for update to anon using (true) with check (true)', rec.tablename);
  end loop;
end$$;
