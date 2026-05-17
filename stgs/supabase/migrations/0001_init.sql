-- STGS — Scientific Travel Grant System
-- Migration 0001: schema (enums, tables, indexes)
-- Mirrors src/lib/store.js so the in-memory demo and the live DB share a shape.
--
-- SRS references: §2.7 (domain model), Анекс Б (glossary), FR-001..FR-024.

-- ── Enumerations (per Анекс Б of SRS) ─────────────────────────────────────
create type applicant_type as enum ('FINKI_Staff', 'UKIM_Visiting', 'External');

create type app_status as enum (
  'Draft',                  -- Нацрт
  'Submitted',              -- Поднесена
  'InReview',               -- Во ревизија
  'Returned',               -- Вратена за дополнување (alt. tek 3a / UC-02)
  'Approved',               -- Одобрена
  'Rejected',               -- Одбиена
  'Cancelled',              -- Поништена  (FR-019)
  'AdvancePaid',            -- Аванс исплатен
  'AwaitingReconciliation', -- Чека порамнување
  'Completed'               -- Завршена
);

create type approval_phase as enum ('ScientificCouncil', 'DeanOffice');

create type approval_decision as enum ('APPROVED', 'REJECTED', 'RETURNED');

create type doc_type as enum ('INVITATION', 'ABSTRACT', 'BUDGET', 'RECEIPT', 'OTHER');

create type role_name as enum (
  'Applicant', 'ScientificCouncil', 'DeanOffice',
  'Accounting', 'HR', 'Archive', 'SystemAdmin'
);

create type notification_type as enum ('StatusChange', 'Reminder', 'Decision', 'SystemMessage');

create type reconciliation_outcome as enum ('TOPUP', 'REFUND', 'EVEN');

-- ── users ─────────────────────────────────────────────────────────────────
-- maps 1:1 to auth.users via id; we duplicate display fields for ease.
create table public.users (
  id              uuid primary key,                       -- = auth.users.id
  email           text unique not null,
  first_name      text not null,
  last_name       text not null,
  title           text,
  role            role_name not null,
  applicant_type  applicant_type default 'FINKI_Staff',
  annual_limit    numeric(10,2) not null default 250000,  -- FR-004
  used            numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);

-- ── budgets (annual department envelope, UC-06 / FR-009) ──────────────────
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  year        int  unique not null,
  total       numeric(12,2) not null,
  spent       numeric(12,2) not null default 0,
  committed   numeric(12,2) not null default 0
);

-- ── applications (the core entity) ────────────────────────────────────────
create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  applicant_id      uuid not null references public.users(id) on delete restrict,
  conference        text not null,
  conference_url    text,
  location          text not null,
  date_from         date not null,
  date_to           date not null,
  requested_amount  numeric(10,2) not null check (requested_amount > 0),
  status            app_status not null default 'Draft',
  phase             approval_phase not null default 'ScientificCouncil',
  advance_paid      numeric(10,2),                                -- FR-016
  sibling_group_id  uuid,                                         -- FR-021
  linked_from_id    uuid references public.applications(id),      -- FR-019
  linked_to_id      uuid references public.applications(id),      -- FR-019
  submitted_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  check (date_to >= date_from)
);
create index applications_applicant_idx on public.applications(applicant_id);
create index applications_status_idx on public.applications(status);
create index applications_sibling_idx on public.applications(sibling_group_id);

-- ── documents (attached to applications) ──────────────────────────────────
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  type            doc_type not null,
  file_name       text not null,
  storage_path    text,                                  -- supabase storage key
  is_shared       boolean not null default false,        -- FR-021
  uploaded_at     timestamptz not null default now()
);
create index documents_app_idx on public.documents(application_id);

-- ── approvals (audit-grade record of every decision) ──────────────────────
create table public.approvals (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  phase           approval_phase not null,
  decision        approval_decision not null,
  by_user_id      uuid not null references public.users(id),
  comment         text,
  decided_at      timestamptz not null default now()
);
create index approvals_app_idx on public.approvals(application_id);

-- ── expense_reports (UC-04, UC-05) ────────────────────────────────────────
create table public.expense_reports (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete restrict,
  applicant_id    uuid not null references public.users(id),
  days_away       int  not null check (days_away >= 0),
  per_diem_rate   numeric(10,2) not null default 0,
  per_diem_total  numeric(10,2) not null default 0,
  transport       numeric(10,2) not null default 0,
  accommodation   numeric(10,2) not null default 0,
  registration    numeric(10,2) not null default 0,
  other           numeric(10,2) not null default 0,
  real_total      numeric(10,2) not null,
  status          text not null default 'AwaitingReconciliation',
  late            boolean not null default false,                 -- FR-010
  submitted_at    timestamptz not null default now(),
  reconciled_at   timestamptz,
  reconciled_by_id uuid references public.users(id),
  outcome         reconciliation_outcome,                          -- FR-008
  outcome_amount  numeric(10,2),
  reconciliation_comment text
);
create index er_app_idx on public.expense_reports(application_id);

-- ── notifications (FR-006 in-app; SMTP integration is future) ─────────────
create table public.notifications (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users(id) on delete cascade,
  type      notification_type not null,
  title     text not null,
  body      text not null,
  at        timestamptz not null default now(),
  read      boolean not null default false
);
create index notifications_user_idx on public.notifications(user_id);

-- ── audit_log (append-only — NFR-001) ─────────────────────────────────────
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references public.users(id),
  action      text not null,
  target_id   text,                                  -- not a FK; can refer to any entity
  meta        jsonb,
  at          timestamptz not null default now()
);
create index audit_actor_idx on public.audit_log(actor_id);
create index audit_action_idx on public.audit_log(action);

-- Block UPDATE/DELETE on audit_log so it's truly append-only.
revoke update, delete on public.audit_log from authenticated, anon;

-- Trigger to refuse any UPDATE/DELETE even from postgres roles (belt + braces).
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only (NFR-001)';
end $$;
create trigger audit_log_no_update before update on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger audit_log_no_delete before delete on public.audit_log
  for each row execute function public.audit_log_immutable();
