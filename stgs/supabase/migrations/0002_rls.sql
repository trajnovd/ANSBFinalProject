-- STGS Migration 0002: Row-Level Security (RLS) policies
--
-- Enforces FR-003 (RBAC) and NFR-001 (security).  These policies are the
-- production-grade equivalent of the in-memory RoleGuard in the React app.
-- Threat model: MUC-01 (Неовластен пристап).

-- Helper: pull the current user's role from public.users (auth.uid() == users.id).
create or replace function public.current_role() returns role_name
  language sql stable security definer set search_path = public as $$
    select role from public.users where id = auth.uid();
  $$;
grant execute on function public.current_role() to authenticated;

-- ── enable RLS on every table ─────────────────────────────────────────────
alter table public.users           enable row level security;
alter table public.budgets         enable row level security;
alter table public.applications    enable row level security;
alter table public.documents       enable row level security;
alter table public.approvals       enable row level security;
alter table public.expense_reports enable row level security;
alter table public.notifications   enable row level security;
alter table public.audit_log       enable row level security;

-- ── users: read own profile + admins/dean can read all ────────────────────
create policy users_self_select on public.users for select
  using ( id = auth.uid() or public.current_role() in ('SystemAdmin','DeanOffice','Accounting') );
-- FR-023: DeanOffice can update annual_limit (transfer between employees).
create policy users_limit_update on public.users for update
  using ( public.current_role() = 'DeanOffice' )
  with check ( public.current_role() = 'DeanOffice' );

-- ── applications ──────────────────────────────────────────────────────────
-- read: applicant sees own; SC/Dean see all in their phase; Accounting sees
-- approved+; Archive/HR/SystemAdmin see all (read-only for HR/Archive).
create policy applications_select on public.applications for select using (
  applicant_id = auth.uid()
  or public.current_role() = 'ScientificCouncil' and phase = 'ScientificCouncil'
  or public.current_role() = 'DeanOffice'         and phase = 'DeanOffice'
  or public.current_role() in ('Accounting','Archive','HR','SystemAdmin')
);
-- insert: only the applicant for themselves.
create policy applications_insert on public.applications for insert
  with check ( applicant_id = auth.uid() and public.current_role() = 'Applicant' );
-- update: applicant on own draft; SC/Dean to advance status; Accounting to mark advance.
create policy applications_update on public.applications for update using (
  (applicant_id = auth.uid() and status in ('Draft','Returned'))
  or public.current_role() in ('ScientificCouncil','DeanOffice','Accounting','SystemAdmin')
);

-- ── documents ─────────────────────────────────────────────────────────────
create policy documents_select on public.documents for select using (
  exists (select 1 from public.applications a where a.id = application_id and (
    a.applicant_id = auth.uid()
    or public.current_role() in ('ScientificCouncil','DeanOffice','Accounting','Archive','HR','SystemAdmin')
  ))
);
create policy documents_insert on public.documents for insert with check (
  exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid())
);

-- ── approvals ─────────────────────────────────────────────────────────────
-- read: applicant + approvers + Accounting + SystemAdmin.
create policy approvals_select on public.approvals for select using (
  exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid())
  or public.current_role() in ('ScientificCouncil','DeanOffice','Accounting','Archive','HR','SystemAdmin')
);
-- write: only SC and Dean can record decisions.
create policy approvals_insert on public.approvals for insert with check (
  public.current_role() in ('ScientificCouncil','DeanOffice')
  and by_user_id = auth.uid()
);

-- ── expense_reports ───────────────────────────────────────────────────────
create policy er_select on public.expense_reports for select using (
  applicant_id = auth.uid()
  or public.current_role() in ('Accounting','DeanOffice','Archive','HR','SystemAdmin')
);
create policy er_insert on public.expense_reports for insert
  with check ( applicant_id = auth.uid() and public.current_role() = 'Applicant' );
-- FR-024: only Accounting can reconcile (set outcome).
create policy er_reconcile on public.expense_reports for update using (
  public.current_role() = 'Accounting'
);

-- ── notifications ─────────────────────────────────────────────────────────
create policy notif_self on public.notifications for select using ( user_id = auth.uid() );
create policy notif_mark_read on public.notifications for update using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- ── audit_log: SELECT only for SystemAdmin; INSERT via SECURITY DEFINER ──
-- (no INSERT policy on purpose — writes go through public.log_audit())
create policy audit_select_admin on public.audit_log for select using (
  public.current_role() = 'SystemAdmin'
);

create or replace function public.log_audit(p_action text, p_target text, p_meta jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, action, target_id, meta)
  values (auth.uid(), p_action, p_target, p_meta);
end $$;
grant execute on function public.log_audit(text, text, jsonb) to authenticated;

-- ── budgets: read for Dean/Accounting/SystemAdmin; update only by Dean ────
create policy budgets_select on public.budgets for select using (
  public.current_role() in ('DeanOffice','Accounting','SystemAdmin')
);
create policy budgets_update on public.budgets for update using (
  public.current_role() = 'DeanOffice'
);
