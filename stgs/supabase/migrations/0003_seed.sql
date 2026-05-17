-- STGS Migration 0003: demo seed data
--
-- Same fixtures as src/lib/store.js#seedInitial so the live backend
-- matches the offline demo. Users are inserted into public.users only;
-- linking them to auth.users is done on first login (auth trigger below).

-- ── users ─────────────────────────────────────────────────────────────────
insert into public.users (id, email, first_name, last_name, title, role, applicant_type, annual_limit, used) values
  ('11111111-1111-1111-1111-111111111111','aleksandar.kostadinov@finki.ukim.mk','Александар','Костадинов','проф. д-р','Applicant','FINKI_Staff',250000,35000),
  ('11111111-1111-1111-1111-111111111112','marija.stojanovska@finki.ukim.mk','Марија','Стојановска','доц. д-р','Applicant','FINKI_Staff',250000,0),
  ('11111111-1111-1111-1111-111111111113','petar.angelovski@finki.ukim.mk','Петар','Ангеловски','асист. м-р','Applicant','FINKI_Staff',250000,80000),
  ('11111111-1111-1111-1111-111111111114','elena.spirovska@pmf.ukim.mk','Елена','Спировска','проф. д-р','Applicant','UKIM_Visiting',250000,0),
  ('22222222-2222-2222-2222-222222222221','darko.popovski@finki.ukim.mk','Дарко','Поповски','проф. д-р','ScientificCouncil','FINKI_Staff',250000,0),
  ('22222222-2222-2222-2222-222222222222','sanja.lazarova@finki.ukim.mk','Сања','Лазарова','проф. д-р','ScientificCouncil','FINKI_Staff',250000,0),
  ('33333333-3333-3333-3333-333333333333','dekan@finki.ukim.mk','Кире','Тримчев','проф. д-р','DeanOffice','FINKI_Staff',250000,0),
  ('44444444-4444-4444-4444-444444444444','smetkovodstvo@finki.ukim.mk','Билјана','Митровска','','Accounting','FINKI_Staff',250000,0),
  ('55555555-5555-5555-5555-555555555555','kadri@finki.ukim.mk','Зоран','Ристовски','','HR','FINKI_Staff',250000,0),
  ('66666666-6666-6666-6666-666666666666','arhiva@finki.ukim.mk','Архива','ФИНКИ','','Archive','FINKI_Staff',250000,0),
  ('77777777-7777-7777-7777-777777777777','admin@finki.ukim.mk','Систем','Администратор','','SystemAdmin','FINKI_Staff',250000,0)
on conflict (id) do nothing;

-- ── department budget (current year) ──────────────────────────────────────
insert into public.budgets (year, total, spent, committed)
values (extract(year from now())::int, 8500000, 1240000, 980000)
on conflict (year) do nothing;

-- ── applications ──────────────────────────────────────────────────────────
insert into public.applications (id, applicant_id, conference, conference_url, location, date_from, date_to, requested_amount, status, phase, advance_paid, submitted_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111',
    'AAAI 2026 — 40th AAAI Conference on Artificial Intelligence',
    'https://aaai.org/Conferences/AAAI-26/','Filadelfija, USA',
    now()::date + interval '20 days', now()::date + interval '25 days',
    145000, 'Submitted', 'ScientificCouncil', null, now() - interval '1 day'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','11111111-1111-1111-1111-111111111112',
    'ICCV 2026 — International Conference on Computer Vision', null,
    'Сеул, Јужна Кореја',
    now()::date + interval '40 days', now()::date + interval '45 days',
    95000, 'InReview', 'DeanOffice', null, now() - interval '3 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111113',
    'ETAPS 2026 — European Joint Conferences on Theory and Practice of Software', null,
    'Прага, Чешка',
    now()::date - interval '10 days', now()::date - interval '5 days',
    78000, 'AdvancePaid', 'DeanOffice', 78000, now() - interval '22 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','11111111-1111-1111-1111-111111111111',
    'ACM SIGGRAPH 2025', null, 'Денвер, USA',
    now()::date - interval '60 days', now()::date - interval '55 days',
    165000, 'Completed', 'DeanOffice', 165000, now() - interval '80 days')
on conflict (id) do nothing;

-- ── documents ─────────────────────────────────────────────────────────────
insert into public.documents (application_id, type, file_name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','INVITATION','aaai_invitation.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','ABSTRACT',  'aaai_abstract.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','BUDGET',    'aaai_proposed_budget.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','INVITATION','iccv_invitation.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','ABSTRACT',  'iccv_paper_camera_ready.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','INVITATION','etaps_invitation.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','ABSTRACT',  'etaps_short_paper.pdf'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','INVITATION','siggraph_invitation.pdf')
on conflict do nothing;

-- ── approvals (history for already-decided apps) ──────────────────────────
insert into public.approvals (application_id, phase, decision, by_user_id, comment, decided_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','ScientificCouncil','APPROVED','22222222-2222-2222-2222-222222222221','Високо релевантна конференција за лабораторијата за компјутерска визија.', now() - interval '2 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','ScientificCouncil','APPROVED','22222222-2222-2222-2222-222222222222','Одобрено.',                          now() - interval '20 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','DeanOffice',       'APPROVED','33333333-3333-3333-3333-333333333333','Во рамки на буџет.',                 now() - interval '18 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','ScientificCouncil','APPROVED','22222222-2222-2222-2222-222222222221', null,                                 now() - interval '80 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','DeanOffice',       'APPROVED','33333333-3333-3333-3333-333333333333', null,                                 now() - interval '78 days');

-- ── expense reports ───────────────────────────────────────────────────────
insert into public.expense_reports (id, application_id, applicant_id, days_away, per_diem_rate, per_diem_total, transport, accommodation, registration, other, real_total, status, late, submitted_at) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111113',6,3800,22800,32000,24000,15000,0,93800,'AwaitingReconciliation',false, now() - interval '2 days')
on conflict (id) do nothing;

insert into public.expense_reports (id, application_id, applicant_id, days_away, per_diem_rate, per_diem_total, transport, accommodation, registration, other, real_total, status, late, submitted_at, reconciled_at, reconciled_by_id, outcome, outcome_amount) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','11111111-1111-1111-1111-111111111111',6,4200,25200,78000,41000,22000,1200,167400,'Reconciled',false, now() - interval '53 days', now() - interval '50 days','44444444-4444-4444-4444-444444444444','TOPUP',2400)
on conflict (id) do nothing;

-- ── notifications (in-app inbox seed) ─────────────────────────────────────
insert into public.notifications (user_id, type, title, body) values
  ('22222222-2222-2222-2222-222222222221','StatusChange','Нова апликација за ревизија','Александар Костадинов поднесе апликација AAAI 2026.'),
  ('33333333-3333-3333-3333-333333333333','StatusChange','Апликација одобрена од НС','ICCV 2026 (Марија Стојановска) очекува деканско одобрување.'),
  ('44444444-4444-4444-4444-444444444444','StatusChange','Извештај за порамнување','Петар Ангеловски поднесе извештај за ETAPS 2026.'),
  ('11111111-1111-1111-1111-111111111113','Reminder',    'Рок за извештај','Имате 36 часа до истекот на 48-часовниот рок за извештај.'),
  ('66666666-6666-6666-6666-666666666666','SystemMessage','Копија архивирана','Дигитална копија на ETAPS 2026 апликација е архивирана.');
