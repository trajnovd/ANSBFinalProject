-- STGS Migration 0004: tighten SECURITY DEFINER helpers (NFR-001 polish).
-- Addresses linter warnings 0011 (mutable search_path) and 0028/0029
-- (SECURITY DEFINER callable by anon).

-- 1) audit_log_immutable: pin search_path so an attacker can't influence it.
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'audit_log is append-only (NFR-001)';
end $$;

-- 2) current_role: revoke from anon + public; keep authenticated only.
revoke execute on function public.current_role() from public;
revoke execute on function public.current_role() from anon;
grant  execute on function public.current_role() to authenticated;

-- 3) log_audit: revoke from anon + public; keep authenticated only.
revoke execute on function public.log_audit(text, text, jsonb) from public;
revoke execute on function public.log_audit(text, text, jsonb) from anon;
grant  execute on function public.log_audit(text, text, jsonb) to authenticated;

-- 4) Hide trigger function from REST surface entirely.
revoke execute on function public.audit_log_immutable() from public;
revoke execute on function public.audit_log_immutable() from anon;
revoke execute on function public.audit_log_immutable() from authenticated;
