# STGS — Систем за управување со грантови за научни патувања

Демонстрациона имплементација на Системот за управување со грантови за научни патувања (STGS) на ФИНКИ — УКИМ, развиена од **Тим CodeLeap** (Бојан Ефтимоски, Јаков Спировски, Дарко Трајанов) врз основа на финалниот СРС v1.1 (IEEE 830-1998).

> **Vibe-coding активност** — курс „Анализа на софтверски барања“ (ФИНКИ, мај 2026). Сите промени се направени преку текстуални промптови кон AI-агент (Claude Code). Нема рачно пишуван код. Деталниот процес-дневник е во [`PROCES_DNEVNIK.md`](PROCES_DNEVNIK.md).

---

## Што е покриено од СРС-от

| Барање | Имплементација | Лоцирано во |
|---|---|---|
| **UC-01** — Поднесување апликација | 4-чекор wizard со sibling-детекција (FR-021), overlap-детекција (FR-020), валидација на лимит (FR-004) | `src/routes/NewApplication.jsx` |
| **UC-02** — Одобрување/одбивање | Two-stage (Научен совет → Деканат), коментар задолжителен при reject/return | `src/routes/Approvals.jsx`, `src/routes/ApplicationDetail.jsx` |
| **UC-03** — Откажи + линкувај нова | FR-019, со blocking-banner при исплатен аванс (FR-024 / alt 4а) | `src/routes/CancelApplication.jsx` |
| **UC-04** — Извештај за патни трошоци | Калкулатор за дневници + транспорт + сместување + котизација, late-marker (FR-010) | `src/routes/NewExpenseReport.jsx`, `src/routes/ExpenseReports.jsx` |
| **UC-05** — Порамнување аванс ↔ реални | Human-in-the-loop (FR-024); auto-резултат TOPUP/REFUND/EVEN | `src/routes/Reconciliation.jsx` |
| **UC-06** — Буџет + извештаи | Стат-картички, hist бар по вработен, CSV (FR-017), пренос на лимит (FR-023) | `src/routes/Budget.jsx` |
| **MUC-01** — Неовластен пристап | RBAC на route ниво + (планирано) RLS политики во Supabase | `src/components/RoleGuard.jsx`, `src/lib/auth.jsx` |
| **NFR-001** — Ревизорска трага | Append-only audit log на сите мутации | `src/lib/store.js`, `src/routes/AuditTrail.jsx` |
| **FR-018** — Повеќејазичност (мк/ен) | i18next, mk default | `src/lib/i18n.js`, `src/locales/mk.json`, `src/locales/en.json` |

---

## Стек

- **React 19** + **Vite 8** (plain JS, не TypeScript)
- **react-router-dom 7** за рутирање
- **i18next** + **react-i18next** за мк/ен
- **date-fns** за датум-помошници
- **Supabase JS SDK** (подготвен но не активен; види „Backend“ подолу)
- LocalStorage како перзистенција за демо

Без UI библиотека — сите компоненти (Button, Card, Field, DataTable, Stat, Modal, Badge) се напишани во `src/components/ui.jsx` (~250 линии). Design tokens се во `src/index.css` (deep blue + warm gold + neutral paper, ФИНКИ-ориентиран дух).

---

## Старт

```bash
cd stgs
npm install
npm run dev
```

Отворете http://localhost:5173. На login-екранот ќе видите **„Demo режим“** со brzi бутони за 10 предефинирани корисници (по еден за секоја улога). Препорачани сесии за демо:

| Корисник | Улога | Што да покажете |
|---|---|---|
| Аплик. А. Костадинов | Applicant | UC-01 wizard, dashboard, лимит |
| Аплик. М. Стојановска | Applicant | Активна апликација (ICCV, во ревизија на Деканат) |
| Член НС Д. Поповски | ScientificCouncil | UC-02 фаза 1 |
| Декан К. Тримчев | DeanOffice | UC-02 фаза 2 + UC-06 (буџет + пренос) |
| Сметководство Б. Митровска | Accounting | UC-05 порамнување, исплата на аванс |
| Системски администратор | SystemAdmin | NFR-001 ревизорска трага |

---

## Структура на проектот

```
stgs/
├── public/stgs.svg          # favicon
├── src/
│   ├── lib/
│   │   ├── i18n.js          # i18next config
│   │   ├── auth.jsx         # AuthProvider, useAuth
│   │   ├── store.js         # data layer (mutations + seed)
│   │   ├── format.js        # mk/en money + date formatting
│   │   └── supabase.js      # клиент (по env vars; gracefully off)
│   ├── locales/
│   │   ├── mk.json          # ~150 клучеви, mk primary
│   │   └── en.json          # English паралела
│   ├── components/
│   │   ├── ui.jsx           # Button, Card, Field, Input, …
│   │   ├── AppShell.jsx     # sidebar + header + notifications
│   │   ├── StatusBadge.jsx
│   │   ├── RoleGuard.jsx
│   │   ├── LangSwitch.jsx
│   │   └── Toast.jsx
│   ├── routes/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Applications.jsx
│   │   ├── ApplicationDetail.jsx
│   │   ├── NewApplication.jsx       # UC-01
│   │   ├── CancelApplication.jsx    # UC-03
│   │   ├── Approvals.jsx            # UC-02
│   │   ├── ExpenseReports.jsx       # UC-04 листа
│   │   ├── NewExpenseReport.jsx     # UC-04 форма
│   │   ├── Reconciliation.jsx       # UC-05
│   │   ├── Budget.jsx               # UC-06
│   │   └── AuditTrail.jsx           # NFR-001 view
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css            # design tokens
├── package.json
├── PROCES_DNEVNIK.md        # работен дневник
└── README.md
```

---

## Backend (Supabase, опционално)

Архитектурата е подготвена за миграција кон Supabase Postgres + Auth + Storage + RLS. Шемата би била 1:1 со `src/lib/store.js`:

```sql
-- Концептуален preview, не applied. Финална migration во подоцнежна верзија.
CREATE TYPE applicant_type AS ENUM ('FINKI_Staff', 'UKIM_Visiting', 'External');
CREATE TYPE app_status     AS ENUM ('Draft','Submitted','InReview','Returned','Approved','Rejected','Cancelled','AdvancePaid','AwaitingReconciliation','Completed');
CREATE TYPE phase          AS ENUM ('ScientificCouncil','DeanOffice');
CREATE TYPE decision       AS ENUM ('APPROVED','REJECTED','RETURNED');
CREATE TYPE doc_type       AS ENUM ('INVITATION','ABSTRACT','BUDGET','RECEIPT','OTHER');
CREATE TYPE role_name      AS ENUM ('Applicant','ScientificCouncil','DeanOffice','Accounting','HR','Archive','SystemAdmin');

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  title           text,
  role            role_name NOT NULL,
  applicant_type  applicant_type DEFAULT 'FINKI_Staff',
  annual_limit    numeric(10,2) DEFAULT 250000,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id      uuid REFERENCES users(id),
  conference        text NOT NULL,
  conference_url    text,
  location          text NOT NULL,
  date_from         date NOT NULL,
  date_to           date NOT NULL,
  requested_amount  numeric(10,2) NOT NULL,
  status            app_status NOT NULL DEFAULT 'Draft',
  phase             phase NOT NULL DEFAULT 'ScientificCouncil',
  advance_paid      numeric(10,2),
  sibling_group_id  uuid,
  linked_from_id    uuid REFERENCES applications(id),
  linked_to_id      uuid REFERENCES applications(id),
  submitted_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  created_at        timestamptz DEFAULT now()
);

-- … documents, approvals, expense_reports, notifications, audit_log (append-only)
```

RLS политики (предложени):
- `applications`: applicant може да чита/пишува *само свои*; членовите на НС/Декан читаат сите со phase = ним; Сметководство чита Approved+. Сите имаат INSERT блокиран на `audit_log` (само backend-функција пишува).
- `audit_log`: SELECT само за SystemAdmin + сопствениот ред; INSERT преку SECURITY DEFINER function.
- `users`: SELECT само на self; UPDATE на `annual_limit` само за DeanOffice (FR-023).

За да го активирате backend режимот:
1. Создадете Supabase проект.
2. Внесете env во `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
3. (Идно) применете ja миграцијата од `supabase/migrations/`.

---

## Презентациски tour (5 минути)

1. Логирајте се како **Аплик. А. Костадинов** → покажете dashboard + лимит.
2. Кликнете „Нова апликација“ → пополнете AAAI 2026 → ќе се појави *sibling offer* (постојна апликација на Костадинов за AAAI).
3. Завршете wizard-от → апликацијата е „Поднесена“.
4. Logout → влезете како **Декан К. Тримчев** → видете 1 апликација во редицата.
5. Отворете ICCV 2026 апликацијата (од seed) → одобрете со коментар.
6. Logout → влезете како **Сметководство Б. Митровска** → Порамнување → одобрете ETAPS 2026 извештај.
7. **Буџет** → покажете стат-картички и hist бар по вработен → демонстрирајте „Пренос на лимит“.
8. **Ревизорска трага** → филтер по actor / action.
9. Презентирајте го `PROCES_DNEVNIK.md`.

---

## Лиценца

Курсова работа, ФИНКИ — УКИМ, 2026. Сите права задржани од Тим CodeLeap.
