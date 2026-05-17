/**
 * STGS data layer.
 *
 * Backing store: localStorage (demo) for fast iteration and for the
 * presentation. The same shape mirrors the planned Supabase schema 1:1,
 * so flipping to the real backend later is mostly swapping function bodies.
 *
 * Entities (per SRS §2.7):
 *   users, applications, documents, approvals, budgets,
 *   expense_reports, notifications, audit_log
 */

const LS_KEY = 'stgs_state_v1'
const listeners = new Set()

function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function writeStore(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state))
  listeners.forEach(fn => { try { fn(state) } catch {} })
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState() {
  return readStore() ?? seedInitial()
}

export function resetState() {
  localStorage.removeItem(LS_KEY)
  return seedInitial()
}

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

function nowIso() { return new Date().toISOString() }

/* ────────────────────────────────────────────────────────────────────────── */
/* Initial seed: realistic FINKI fixtures for the demo                         */
/* ────────────────────────────────────────────────────────────────────────── */

function seedInitial() {
  const year = new Date().getFullYear()
  const annualLimit = 250000 // MKD per applicant per year

  const users = [
    // FINKI staff applicants
    { id: 'u_aleksandar', email: 'aleksandar.kostadinov@finki.ukim.mk', firstName: 'Александар', lastName: 'Костадинов', title: 'проф. д-р', role: 'Applicant', applicantType: 'FINKI_Staff', annualLimit, used: 35000 },
    { id: 'u_marija',     email: 'marija.stojanovska@finki.ukim.mk',    firstName: 'Марија',     lastName: 'Стојановска', title: 'доц. д-р', role: 'Applicant', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    { id: 'u_petar',      email: 'petar.angelovski@finki.ukim.mk',      firstName: 'Петар',      lastName: 'Ангеловски',  title: 'асист. м-р',role:'Applicant', applicantType: 'FINKI_Staff', annualLimit, used: 80000 },
    // UKIM visiting (SSO via iKnow)
    { id: 'u_visiting',   email: 'elena.spirovska@pmf.ukim.mk',         firstName: 'Елена',      lastName: 'Спировска',  title: 'проф. д-р', role: 'Applicant', applicantType: 'UKIM_Visiting', annualLimit, used: 0 },
    // Scientific Council
    { id: 'u_council1',   email: 'darko.popovski@finki.ukim.mk',        firstName: 'Дарко',      lastName: 'Поповски',    title: 'проф. д-р', role: 'ScientificCouncil', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    { id: 'u_council2',   email: 'sanja.lazarova@finki.ukim.mk',        firstName: 'Сања',       lastName: 'Лазарова',    title: 'проф. д-р', role: 'ScientificCouncil', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    // Dean's Office
    { id: 'u_dean',       email: 'dekan@finki.ukim.mk',                 firstName: 'Кире',       lastName: 'Тримчев',     title: 'проф. д-р', role: 'DeanOffice', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    // Accounting
    { id: 'u_acct',       email: 'smetkovodstvo@finki.ukim.mk',         firstName: 'Билјана',    lastName: 'Митровска',  title: '',          role: 'Accounting', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    // HR (notified only, no decisions)
    { id: 'u_hr',         email: 'kadri@finki.ukim.mk',                 firstName: 'Зоран',      lastName: 'Ристовски',   title: '',          role: 'HR', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    // Archive
    { id: 'u_arhiva',     email: 'arhiva@finki.ukim.mk',                firstName: 'Архива',     lastName: 'ФИНКИ',       title: '',          role: 'Archive', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
    // System admin
    { id: 'u_admin',      email: 'admin@finki.ukim.mk',                 firstName: 'Систем',     lastName: 'Администратор',title:'',          role: 'SystemAdmin', applicantType: 'FINKI_Staff', annualLimit, used: 0 },
  ]

  // Department-level budget envelope
  const budgets = [
    { id: 'b_' + year, year, total: 8500000, spent: 1240000, committed: 980000 },
  ]

  // Sample applications across different statuses
  const apps = [
    // 1) Submitted, waiting Scientific Council (UC-02 demo)
    sampleApp({
      id: 'a_ai_2026',
      applicantId: 'u_aleksandar',
      conference: 'AAAI 2026 — 40th AAAI Conference on Artificial Intelligence',
      conferenceUrl: 'https://aaai.org/Conferences/AAAI-26/',
      location: 'Filadelfija, USA',
      from: addDays(20), to: addDays(25),
      amount: 145000,
      status: 'Submitted', phase: 'ScientificCouncil',
      docs: [
        { id: 'd_inv1', type: 'INVITATION', fileName: 'aaai_invitation.pdf' },
        { id: 'd_abs1', type: 'ABSTRACT', fileName: 'aaai_abstract.pdf' },
        { id: 'd_bdg1', type: 'BUDGET', fileName: 'aaai_proposed_budget.pdf' },
      ],
    }),
    // 2) In review at Dean (after SC approved)
    sampleApp({
      id: 'a_iccv',
      applicantId: 'u_marija',
      conference: 'ICCV 2026 — International Conference on Computer Vision',
      location: 'Сеул, Јужна Кореја',
      from: addDays(40), to: addDays(45),
      amount: 95000,
      status: 'InReview', phase: 'DeanOffice',
      approvals: [
        { id: 'ap_1', phase: 'ScientificCouncil', decision: 'APPROVED', byId: 'u_council1', comment: 'Високо релевантна конференција за лабораторијата за компјутерска визија.', at: daysAgo(2) },
      ],
      docs: [
        { id: 'd_inv2', type: 'INVITATION', fileName: 'iccv_invitation.pdf' },
        { id: 'd_abs2', type: 'ABSTRACT', fileName: 'iccv_paper_camera_ready.pdf' },
      ],
    }),
    // 3) Approved + advance paid (waiting for travel + report)
    sampleApp({
      id: 'a_etaps',
      applicantId: 'u_petar',
      conference: 'ETAPS 2026 — European Joint Conferences on Theory and Practice of Software',
      location: 'Прага, Чешка',
      from: addDays(-10), to: addDays(-5),
      amount: 78000,
      status: 'AdvancePaid', phase: 'DeanOffice',
      advancePaid: 78000,
      approvals: [
        { id: 'ap_2', phase: 'ScientificCouncil', decision: 'APPROVED', byId: 'u_council2', comment: 'Одобрено.', at: daysAgo(20) },
        { id: 'ap_3', phase: 'DeanOffice',        decision: 'APPROVED', byId: 'u_dean',     comment: 'Во рамки на буџет.', at: daysAgo(18) },
      ],
      docs: [
        { id: 'd_inv3', type: 'INVITATION', fileName: 'etaps_invitation.pdf' },
        { id: 'd_abs3', type: 'ABSTRACT', fileName: 'etaps_short_paper.pdf' },
      ],
    }),
    // 4) Completed application (report submitted, reconciliation done)
    sampleApp({
      id: 'a_acm',
      applicantId: 'u_aleksandar',
      conference: 'ACM SIGGRAPH 2025',
      location: 'Денвер, USA',
      from: daysAgo(60), to: daysAgo(55),
      amount: 165000,
      status: 'Completed', phase: 'DeanOffice',
      advancePaid: 165000,
      approvals: [
        { id: 'ap_4', phase: 'ScientificCouncil', decision: 'APPROVED', byId: 'u_council1', at: daysAgo(80) },
        { id: 'ap_5', phase: 'DeanOffice',        decision: 'APPROVED', byId: 'u_dean',     at: daysAgo(78) },
      ],
      docs: [
        { id: 'd_inv4', type: 'INVITATION', fileName: 'siggraph_invitation.pdf' },
      ],
    }),
  ]

  // One expense report for the AdvancePaid app (Petar / ETAPS) ready to reconcile
  const expense_reports = [
    {
      id: 'er_etaps', applicationId: 'a_etaps', applicantId: 'u_petar',
      daysAway: 6, perDiemRate: 3800, perDiemTotal: 22800,
      transport: 32000, accommodation: 24000, registration: 15000, other: 0,
      realTotal: 93800,
      submittedAt: daysAgo(2),
      status: 'AwaitingReconciliation',
      late: false,
      receipts: [
        { id: 'r_1', fileName: 'aviobilet.pdf' },
        { id: 'r_2', fileName: 'hotel_invoice.pdf' },
        { id: 'r_3', fileName: 'registration.pdf' },
      ],
    },
    // Reconciled report tied to completed app
    {
      id: 'er_acm', applicationId: 'a_acm', applicantId: 'u_aleksandar',
      daysAway: 6, perDiemRate: 4200, perDiemTotal: 25200,
      transport: 78000, accommodation: 41000, registration: 22000, other: 1200,
      realTotal: 167400,
      submittedAt: daysAgo(53),
      reconciledAt: daysAgo(50),
      reconciledById: 'u_acct',
      outcome: 'TOPUP', outcomeAmount: 2400, // top-up to applicant
      status: 'Reconciled',
      late: false,
      receipts: [],
    },
  ]

  const notifications = [
    notif('u_council1', 'StatusChange', 'Нова апликација за ревизија', 'Александар Костадинов поднесе апликација AAAI 2026.', daysAgo(0)),
    notif('u_dean',     'StatusChange', 'Апликација одобрена од НС',     'ICCV 2026 (Марија Стојановска) очекува деканско одобрување.', daysAgo(2)),
    notif('u_acct',     'StatusChange', 'Извештај за порамнување',       'Петар Ангеловски поднесе извештај за ETAPS 2026.', daysAgo(2)),
    notif('u_petar',    'Reminder',     'Рок за извештај',                'Имате 36 часа до истекот на 48-часовниот рок за извештај.', daysAgo(2)),
    notif('u_arhiva',   'SystemMessage','Копија архивирана',              'Дигитална копија на ETAPS 2026 апликација е архивирана.', daysAgo(18)),
  ]

  const audit_log = [
    audit('u_aleksandar', 'APPLICATION_SUBMITTED', 'a_ai_2026', daysAgo(0)),
    audit('u_marija',     'APPLICATION_SUBMITTED', 'a_iccv',     daysAgo(3)),
    audit('u_council1',   'APPROVAL_RECORDED',     'a_iccv',     daysAgo(2)),
    audit('u_petar',      'APPLICATION_SUBMITTED', 'a_etaps',    daysAgo(22)),
    audit('u_council2',   'APPROVAL_RECORDED',     'a_etaps',    daysAgo(20)),
    audit('u_dean',       'APPROVAL_RECORDED',     'a_etaps',    daysAgo(18)),
    audit('u_acct',       'ADVANCE_PAID',          'a_etaps',    daysAgo(15)),
    audit('u_petar',      'EXPENSE_REPORT_SUBMIT', 'er_etaps',   daysAgo(2)),
  ]

  const state = { schema: 1, users, applications: apps, budgets, expense_reports, notifications, audit_log, siblings: [] }
  writeStore(state)
  return state
}

function sampleApp(p) {
  return {
    id: p.id,
    applicantId: p.applicantId,
    conference: p.conference,
    conferenceUrl: p.conferenceUrl ?? null,
    location: p.location,
    from: p.from, to: p.to,
    requestedAmount: p.amount,
    status: p.status,
    phase: p.phase ?? 'ScientificCouncil',
    documents: p.docs ?? [],
    approvals: p.approvals ?? [],
    advancePaid: p.advancePaid ?? null,
    submittedAt: p.submittedAt ?? daysAgo(Math.max(1, Math.round(Math.random() * 5))),
    cancelledAt: null,
    cancelReason: null,
    linkedToId: null,
    linkedFromId: null,
    siblingGroupId: null,
  }
}

function notif(userId, type, title, body, at) {
  return { id: uid('n'), userId, type, title, body, at, read: false }
}

function audit(actorId, action, targetId, at) {
  return { id: uid('au'), actorId, action, targetId, at }
}

function addDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Mutations                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function mutate(updater) {
  const state = getState()
  const next = updater(state) || state
  writeStore(next)
  return next
}

export function logAudit(actorId, action, targetId, meta = {}) {
  mutate(s => {
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId, action, targetId, at: nowIso(), meta }]
    return s
  })
}

export function pushNotification(userId, type, title, body) {
  mutate(s => {
    s.notifications = [...s.notifications, { id: uid('n'), userId, type, title, body, at: nowIso(), read: false }]
    return s
  })
}

export function markNotificationRead(notifId) {
  mutate(s => {
    s.notifications = s.notifications.map(n => n.id === notifId ? { ...n, read: true } : n)
    return s
  })
}

export function createApplication(data) {
  const id = uid('a')
  mutate(s => {
    const app = {
      id,
      applicantId: data.applicantId,
      conference: data.conference,
      conferenceUrl: data.conferenceUrl ?? null,
      location: data.location,
      from: data.from, to: data.to,
      requestedAmount: Number(data.requestedAmount),
      status: data.status ?? 'Submitted',
      phase: 'ScientificCouncil',
      documents: data.documents ?? [],
      approvals: [],
      advancePaid: null,
      submittedAt: nowIso(),
      cancelledAt: null,
      cancelReason: null,
      linkedToId: null,
      linkedFromId: data.linkedFromId ?? null,
      siblingGroupId: data.siblingGroupId ?? null,
    }
    s.applications = [...s.applications, app]
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: data.applicantId, action: data.status === 'Draft' ? 'APPLICATION_DRAFTED' : 'APPLICATION_SUBMITTED', targetId: id, at: nowIso() }]
    if (data.status !== 'Draft') {
      const council = s.users.filter(u => u.role === 'ScientificCouncil')
      council.forEach(c => {
        s.notifications = [...s.notifications, { id: uid('n'), userId: c.id, type: 'StatusChange', title: 'Нова апликација за ревизија', body: data.conference + ' — поднесена од апликант.', at: nowIso(), read: false }]
      })
    }
    return s
  })
  return id
}

export function recordApprovalDecision({ applicationId, byUserId, decision, comment }) {
  mutate(s => {
    const app = s.applications.find(a => a.id === applicationId)
    if (!app) return s
    const approver = s.users.find(u => u.id === byUserId)
    const phase = app.phase
    app.approvals = [...app.approvals, { id: uid('ap'), phase, decision, byId: byUserId, comment, at: nowIso() }]
    if (decision === 'APPROVED') {
      if (phase === 'ScientificCouncil') {
        app.phase = 'DeanOffice'
        app.status = 'InReview'
        const deans = s.users.filter(u => u.role === 'DeanOffice')
        deans.forEach(d => {
          s.notifications = [...s.notifications, { id: uid('n'), userId: d.id, type: 'StatusChange', title: 'Апликација одобрена од НС', body: app.conference + ' — потребно деканско одобрување.', at: nowIso(), read: false }]
        })
      } else {
        app.status = 'Approved'
        s.notifications = [...s.notifications, { id: uid('n'), userId: app.applicantId, type: 'StatusChange', title: 'Апликацијата е одобрена', body: app.conference + ' — одобрена од Деканат.', at: nowIso(), read: false }]
      }
    } else if (decision === 'REJECTED') {
      app.status = 'Rejected'
      s.notifications = [...s.notifications, { id: uid('n'), userId: app.applicantId, type: 'StatusChange', title: 'Апликацијата е одбиена', body: comment ?? '', at: nowIso(), read: false }]
    } else if (decision === 'RETURNED') {
      app.status = 'Returned'
      s.notifications = [...s.notifications, { id: uid('n'), userId: app.applicantId, type: 'StatusChange', title: 'Апликацијата е вратена за дополнување', body: comment ?? '', at: nowIso(), read: false }]
    }
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: byUserId, action: 'APPROVAL_RECORDED', targetId: applicationId, at: nowIso(), meta: { decision, phase } }]
    return s
  })
}

export function cancelAndLinkApplication({ oldId, byUserId, reason, newData }) {
  let newId = null
  mutate(s => {
    const old = s.applications.find(a => a.id === oldId)
    if (!old) return s
    old.status = 'Cancelled'
    old.cancelledAt = nowIso()
    old.cancelReason = reason
    newId = uid('a')
    const newApp = {
      id: newId,
      applicantId: old.applicantId,
      conference: newData.conference,
      conferenceUrl: newData.conferenceUrl ?? null,
      location: newData.location,
      from: newData.from, to: newData.to,
      requestedAmount: Number(newData.requestedAmount),
      status: 'Submitted',
      phase: 'ScientificCouncil',
      documents: newData.documents ?? [],
      approvals: [],
      advancePaid: null,
      submittedAt: nowIso(),
      cancelledAt: null, cancelReason: null,
      linkedFromId: oldId, linkedToId: null,
      siblingGroupId: null,
    }
    old.linkedToId = newId
    s.applications = [...s.applications, newApp]
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: byUserId, action: 'APPLICATION_CANCELLED', targetId: oldId, at: nowIso(), meta: { reason, linkedTo: newId } }]
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: byUserId, action: 'APPLICATION_SUBMITTED', targetId: newId, at: nowIso(), meta: { linkedFrom: oldId } }]
    const council = s.users.filter(u => u.role === 'ScientificCouncil')
    council.forEach(c => {
      s.notifications = [...s.notifications, { id: uid('n'), userId: c.id, type: 'StatusChange', title: 'Линкувана апликација за ревизија', body: newData.conference + ' — заменува поништена.', at: nowIso(), read: false }]
    })
    if (old.advancePaid) {
      s.notifications = [...s.notifications, { id: uid('n'), userId: 'u_acct', type: 'StatusChange', title: 'Аванс — потребна рачна потврда за враќање', body: 'Поништена апликација со исплатен аванс ' + old.advancePaid + ' МКД.', at: nowIso(), read: false }]
    }
    return s
  })
  return newId
}

export function submitExpenseReport(data) {
  const id = uid('er')
  mutate(s => {
    const er = { ...data, id, status: 'AwaitingReconciliation', submittedAt: nowIso() }
    s.expense_reports = [...s.expense_reports, er]
    const app = s.applications.find(a => a.id === data.applicationId)
    if (app) {
      app.status = 'AwaitingReconciliation'
      app.phase = 'DeanOffice'
    }
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: data.applicantId, action: 'EXPENSE_REPORT_SUBMIT', targetId: id, at: nowIso() }]
    s.notifications = [...s.notifications, { id: uid('n'), userId: 'u_acct', type: 'StatusChange', title: 'Извештај за порамнување', body: (app?.conference ?? '') + ' — извештајот чека порамнување.', at: nowIso(), read: false }]
    return s
  })
  return id
}

export function reconcileReport({ reportId, byUserId, outcome, outcomeAmount, comment }) {
  mutate(s => {
    const er = s.expense_reports.find(r => r.id === reportId)
    if (!er) return s
    er.status = 'Reconciled'
    er.reconciledAt = nowIso()
    er.reconciledById = byUserId
    er.outcome = outcome
    er.outcomeAmount = outcomeAmount
    er.reconciliationComment = comment ?? null
    const app = s.applications.find(a => a.id === er.applicationId)
    if (app) {
      app.status = 'Completed'
    }
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: byUserId, action: 'RECONCILED', targetId: reportId, at: nowIso(), meta: { outcome, outcomeAmount } }]
    s.notifications = [...s.notifications, { id: uid('n'), userId: er.applicantId, type: 'StatusChange', title: 'Извештајот е порамнет', body: outcome === 'TOPUP' ? 'Доплата: ' + outcomeAmount + ' МКД.' : outcome === 'REFUND' ? 'Поврат во буџет: ' + outcomeAmount + ' МКД.' : 'Без финансиска корекција.', at: nowIso(), read: false }]
    return s
  })
}

export function transferAnnualLimit({ fromUserId, toUserId, amount, approverId }) {
  mutate(s => {
    const a = s.users.find(u => u.id === fromUserId)
    const b = s.users.find(u => u.id === toUserId)
    if (!a || !b) return s
    a.annualLimit = Math.max(0, a.annualLimit - amount)
    b.annualLimit += amount
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: approverId, action: 'BUDGET_TRANSFER', targetId: fromUserId, at: nowIso(), meta: { fromUserId, toUserId, amount } }]
    return s
  })
}

export function payAdvance({ applicationId, amount, byUserId }) {
  mutate(s => {
    const app = s.applications.find(a => a.id === applicationId)
    if (!app) return s
    app.advancePaid = amount
    app.status = 'AdvancePaid'
    s.audit_log = [...s.audit_log, { id: uid('au'), actorId: byUserId, action: 'ADVANCE_PAID', targetId: applicationId, at: nowIso(), meta: { amount } }]
    s.notifications = [...s.notifications, { id: uid('n'), userId: app.applicantId, type: 'StatusChange', title: 'Авансот е исплатен', body: app.conference + ' — ' + amount + ' МКД.', at: nowIso(), read: false }]
    return s
  })
}
