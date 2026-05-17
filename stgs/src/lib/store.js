/**
 * STGS data layer — Supabase-backed.
 *
 * The module keeps a synchronous in-memory mirror so existing routes
 * (which call getState() synchronously inside render) keep working.
 *
 * Lifecycle:
 *   1. bootstrap() — async; fetches all tables from Supabase, stitches them
 *      into the in-memory shape, sets _state, notifies subscribers. Called
 *      once from <App /> before routes mount.
 *   2. getState() — sync; returns the latest _state. Until bootstrap
 *      resolves, returns a minimal placeholder so the UI can render.
 *   3. mutators — apply an optimistic local update immediately, then write
 *      to Supabase in the background. Failures are logged; they don't roll
 *      back the optimistic state (demo-grade behaviour).
 *
 * Field-name convention: the in-memory shape uses camelCase to keep route
 * code unchanged; the Supabase columns use snake_case. Mapping happens at
 * the boundary functions below (toRowX / fromRowX).
 */

import { supabase, hasBackend } from './supabase.js'

const listeners = new Set()
let _state = emptyState()
let _bootstrapped = false

function emptyState() {
  return {
    schema: 1,
    users: [],
    applications: [],
    budgets: [],
    expense_reports: [],
    notifications: [],
    audit_log: [],
    siblings: [],
  }
}

function notifyAll() {
  listeners.forEach(fn => { try { fn(_state) } catch {} })
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState() {
  return _state
}

export function isReady() {
  return _bootstrapped
}

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

function nowIso() { return new Date().toISOString() }

/* ────────────────────────────────────────────────────────────────────────── */
/* Row ↔ in-memory mappers                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function fromRowUser(r) {
  return {
    id: r.id,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    title: r.title,
    role: r.role,
    applicantType: r.applicant_type,
    annualLimit: Number(r.annual_limit),
    used: Number(r.used),
  }
}

function fromRowApp(r) {
  return {
    id: r.id,
    applicantId: r.applicant_id,
    conference: r.conference,
    conferenceUrl: r.conference_url,
    location: r.location,
    from: r.date_from,
    to: r.date_to,
    requestedAmount: Number(r.requested_amount),
    status: r.status,
    phase: r.phase,
    advancePaid: r.advance_paid !== null ? Number(r.advance_paid) : null,
    siblingGroupId: r.sibling_group_id,
    linkedFromId: r.linked_from_id,
    linkedToId: r.linked_to_id,
    submittedAt: r.submitted_at,
    cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    documents: [],
    approvals: [],
  }
}

function fromRowDoc(r) {
  return {
    id: r.id,
    applicationId: r.application_id,
    type: r.type,
    fileName: r.file_name,
    storagePath: r.storage_path,
    isShared: r.is_shared,
    uploadedAt: r.uploaded_at,
  }
}

function fromRowApproval(r) {
  return {
    id: r.id,
    applicationId: r.application_id,
    phase: r.phase,
    decision: r.decision,
    byId: r.by_user_id,
    comment: r.comment,
    at: r.decided_at,
  }
}

function fromRowEr(r) {
  return {
    id: r.id,
    applicationId: r.application_id,
    applicantId: r.applicant_id,
    daysAway: r.days_away,
    perDiemRate: Number(r.per_diem_rate),
    perDiemTotal: Number(r.per_diem_total),
    transport: Number(r.transport),
    accommodation: Number(r.accommodation),
    registration: Number(r.registration),
    other: Number(r.other),
    realTotal: Number(r.real_total),
    status: r.status,
    late: r.late,
    submittedAt: r.submitted_at,
    reconciledAt: r.reconciled_at,
    reconciledById: r.reconciled_by_id,
    outcome: r.outcome,
    outcomeAmount: r.outcome_amount !== null ? Number(r.outcome_amount) : null,
    reconciliationComment: r.reconciliation_comment,
    receipts: [],
  }
}

function fromRowNotif(r) {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    body: r.body,
    at: r.at,
    read: r.read,
  }
}

function fromRowAudit(r) {
  return {
    id: r.id,
    actorId: r.actor_id,
    action: r.action,
    targetId: r.target_id,
    meta: r.meta,
    at: r.at,
  }
}

function fromRowBudget(r) {
  return {
    id: r.id,
    year: r.year,
    total: Number(r.total),
    spent: Number(r.spent),
    committed: Number(r.committed),
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Bootstrap — pulls everything from Supabase                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export async function bootstrap() {
  if (_bootstrapped) return _state
  if (!hasBackend) {
    console.warn('[STGS] No Supabase backend configured — running with empty state.')
    _bootstrapped = true
    return _state
  }

  try {
    const [usersR, appsR, docsR, apprR, ersR, notifR, auditR, budR] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('applications').select('*'),
      supabase.from('documents').select('*'),
      supabase.from('approvals').select('*'),
      supabase.from('expense_reports').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('audit_log').select('*'),
      supabase.from('budgets').select('*'),
    ])

    const errs = [usersR, appsR, docsR, apprR, ersR, notifR, auditR, budR]
      .map(r => r.error).filter(Boolean)
    if (errs.length) throw new Error(errs.map(e => e.message).join('; '))

    const apps = (appsR.data ?? []).map(fromRowApp)
    const appById = new Map(apps.map(a => [a.id, a]))
    for (const d of (docsR.data ?? []).map(fromRowDoc)) {
      const a = appById.get(d.applicationId); if (a) a.documents.push(d)
    }
    for (const a of (apprR.data ?? []).map(fromRowApproval)) {
      const app = appById.get(a.applicationId); if (app) app.approvals.push(a)
    }

    _state = {
      schema: 1,
      users: (usersR.data ?? []).map(fromRowUser),
      applications: apps,
      budgets: (budR.data ?? []).map(fromRowBudget),
      expense_reports: (ersR.data ?? []).map(fromRowEr),
      notifications: (notifR.data ?? []).map(fromRowNotif),
      audit_log: (auditR.data ?? []).map(fromRowAudit),
      siblings: [],
    }
    _bootstrapped = true
    notifyAll()
    return _state
  } catch (e) {
    console.error('[STGS] bootstrap failed:', e)
    _bootstrapped = true                 // don't block UI; UI will show empty state
    return _state
  }
}

export async function refresh() {
  _bootstrapped = false
  return bootstrap()
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Mutators                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function applyLocal(updater) {
  const next = updater(_state) || _state
  _state = next
  notifyAll()
  return _state
}

function bgWrite(label, p) {
  if (!p) return
  Promise.resolve(p).then(res => {
    if (res?.error) console.error('[STGS] ' + label + ' failed:', res.error)
  }).catch(e => console.error('[STGS] ' + label + ' threw:', e))
}

function accountingUserId() {
  return _state.users.find(u => u.role === 'Accounting')?.id ?? null
}

export function logAudit(actorId, action, targetId, meta = {}) {
  const id = uid('au')
  const at = nowIso()
  applyLocal(s => {
    s.audit_log = [...s.audit_log, { id, actorId, action, targetId, at, meta }]
    return s
  })
  if (hasBackend) {
    bgWrite('logAudit', supabase.from('audit_log').insert({
      actor_id: actorId, action, target_id: targetId, meta,
    }))
  }
}

export function pushNotification(userId, type, title, body) {
  if (!userId) return
  const id = uid('n')
  const at = nowIso()
  applyLocal(s => {
    s.notifications = [...s.notifications, { id, userId, type, title, body, at, read: false }]
    return s
  })
  if (hasBackend) {
    bgWrite('pushNotification', supabase.from('notifications').insert({
      user_id: userId, type, title, body,
    }))
  }
}

export function markNotificationRead(notifId) {
  applyLocal(s => {
    s.notifications = s.notifications.map(n => n.id === notifId ? { ...n, read: true } : n)
    return s
  })
  if (hasBackend) {
    bgWrite('markNotificationRead', supabase.from('notifications')
      .update({ read: true }).eq('id', notifId))
  }
}

export function createApplication(data) {
  // Supabase generates the UUID; for the optimistic UI we mint one locally
  // and pass it as the row id so future references stay stable.
  const id = crypto.randomUUID()
  const submittedAt = nowIso()
  const status = data.status ?? 'Submitted'
  applyLocal(s => {
    const app = {
      id,
      applicantId: data.applicantId,
      conference: data.conference,
      conferenceUrl: data.conferenceUrl ?? null,
      location: data.location,
      from: data.from, to: data.to,
      requestedAmount: Number(data.requestedAmount),
      status,
      phase: 'ScientificCouncil',
      documents: data.documents ?? [],
      approvals: [],
      advancePaid: null,
      submittedAt,
      cancelledAt: null,
      cancelReason: null,
      linkedToId: null,
      linkedFromId: data.linkedFromId ?? null,
      siblingGroupId: data.siblingGroupId ?? null,
    }
    s.applications = [...s.applications, app]
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: data.applicantId,
      action: status === 'Draft' ? 'APPLICATION_DRAFTED' : 'APPLICATION_SUBMITTED',
      targetId: id, at: submittedAt,
    }]
    if (status !== 'Draft') {
      const council = s.users.filter(u => u.role === 'ScientificCouncil')
      council.forEach(c => {
        s.notifications = [...s.notifications, {
          id: uid('n'), userId: c.id, type: 'StatusChange',
          title: 'Нова апликација за ревизија',
          body: data.conference + ' — поднесена од апликант.',
          at: nowIso(), read: false,
        }]
      })
    }
    return s
  })

  if (hasBackend) {
    bgWrite('createApplication', (async () => {
      const ins = await supabase.from('applications').insert({
        id,
        applicant_id: data.applicantId,
        conference: data.conference,
        conference_url: data.conferenceUrl ?? null,
        location: data.location,
        date_from: data.from,
        date_to: data.to,
        requested_amount: Number(data.requestedAmount),
        status,
        phase: 'ScientificCouncil',
        sibling_group_id: data.siblingGroupId ?? null,
        linked_from_id: data.linkedFromId ?? null,
        submitted_at: status === 'Draft' ? null : submittedAt,
      })
      if (ins.error) return ins
      await supabase.from('audit_log').insert({
        actor_id: data.applicantId,
        action: status === 'Draft' ? 'APPLICATION_DRAFTED' : 'APPLICATION_SUBMITTED',
        target_id: id,
      })
      if (status !== 'Draft') {
        const council = _state.users.filter(u => u.role === 'ScientificCouncil')
        if (council.length) {
          await supabase.from('notifications').insert(council.map(c => ({
            user_id: c.id, type: 'StatusChange',
            title: 'Нова апликација за ревизија',
            body: data.conference + ' — поднесена од апликант.',
          })))
        }
      }
      return ins
    })())
  }

  return id
}

export function recordApprovalDecision({ applicationId, byUserId, decision, comment }) {
  const apId = crypto.randomUUID()
  const at = nowIso()
  let nextStatus = null
  let nextPhase = null
  let appConference = ''
  let applicantId = null

  applyLocal(s => {
    const app = s.applications.find(a => a.id === applicationId)
    if (!app) return s
    appConference = app.conference
    applicantId = app.applicantId
    const phase = app.phase
    app.approvals = [...app.approvals, { id: apId, applicationId, phase, decision, byId: byUserId, comment, at }]

    if (decision === 'APPROVED') {
      if (phase === 'ScientificCouncil') {
        app.phase = 'DeanOffice'; app.status = 'InReview'
        nextPhase = 'DeanOffice'; nextStatus = 'InReview'
        const deans = s.users.filter(u => u.role === 'DeanOffice')
        deans.forEach(d => {
          s.notifications = [...s.notifications, {
            id: uid('n'), userId: d.id, type: 'StatusChange',
            title: 'Апликација одобрена од НС',
            body: app.conference + ' — потребно деканско одобрување.',
            at, read: false,
          }]
        })
      } else {
        app.status = 'Approved'; nextStatus = 'Approved'
        s.notifications = [...s.notifications, {
          id: uid('n'), userId: app.applicantId, type: 'StatusChange',
          title: 'Апликацијата е одобрена',
          body: app.conference + ' — одобрена од Деканат.',
          at, read: false,
        }]
      }
    } else if (decision === 'REJECTED') {
      app.status = 'Rejected'; nextStatus = 'Rejected'
      s.notifications = [...s.notifications, {
        id: uid('n'), userId: app.applicantId, type: 'StatusChange',
        title: 'Апликацијата е одбиена', body: comment ?? '', at, read: false,
      }]
    } else if (decision === 'RETURNED') {
      app.status = 'Returned'; nextStatus = 'Returned'
      s.notifications = [...s.notifications, {
        id: uid('n'), userId: app.applicantId, type: 'StatusChange',
        title: 'Апликацијата е вратена за дополнување', body: comment ?? '', at, read: false,
      }]
    }
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: byUserId, action: 'APPROVAL_RECORDED',
      targetId: applicationId, at, meta: { decision, phase },
    }]
    return s
  })

  if (hasBackend) {
    bgWrite('recordApprovalDecision', (async () => {
      // approvals row
      const app = _state.applications.find(a => a.id === applicationId)
      const ins = await supabase.from('approvals').insert({
        id: apId,
        application_id: applicationId,
        phase: app?.approvals?.find(x => x.id === apId)?.phase ?? 'ScientificCouncil',
        decision,
        by_user_id: byUserId,
        comment: comment ?? null,
        decided_at: at,
      })
      if (ins.error) return ins
      // application status / phase update
      const patch = {}
      if (nextStatus) patch.status = nextStatus
      if (nextPhase) patch.phase = nextPhase
      if (Object.keys(patch).length) {
        await supabase.from('applications').update(patch).eq('id', applicationId)
      }
      // audit
      await supabase.from('audit_log').insert({
        actor_id: byUserId, action: 'APPROVAL_RECORDED',
        target_id: applicationId, meta: { decision },
      })
      // notifications
      const notifs = []
      if (decision === 'APPROVED' && nextPhase === 'DeanOffice') {
        const deans = _state.users.filter(u => u.role === 'DeanOffice')
        deans.forEach(d => notifs.push({
          user_id: d.id, type: 'StatusChange',
          title: 'Апликација одобрена од НС',
          body: appConference + ' — потребно деканско одобрување.',
        }))
      } else if (decision === 'APPROVED' && nextStatus === 'Approved') {
        if (applicantId) notifs.push({
          user_id: applicantId, type: 'StatusChange',
          title: 'Апликацијата е одобрена',
          body: appConference + ' — одобрена од Деканат.',
        })
      } else if (decision === 'REJECTED' && applicantId) {
        notifs.push({ user_id: applicantId, type: 'StatusChange',
          title: 'Апликацијата е одбиена', body: comment ?? '' })
      } else if (decision === 'RETURNED' && applicantId) {
        notifs.push({ user_id: applicantId, type: 'StatusChange',
          title: 'Апликацијата е вратена за дополнување', body: comment ?? '' })
      }
      if (notifs.length) await supabase.from('notifications').insert(notifs)
      return ins
    })())
  }
}

export function cancelAndLinkApplication({ oldId, byUserId, reason, newData }) {
  const newId = crypto.randomUUID()
  const at = nowIso()
  let oldAdvance = null
  let acctId = accountingUserId()

  applyLocal(s => {
    const old = s.applications.find(a => a.id === oldId)
    if (!old) return s
    old.status = 'Cancelled'
    old.cancelledAt = at
    old.cancelReason = reason
    old.linkedToId = newId
    oldAdvance = old.advancePaid
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
      submittedAt: at,
      cancelledAt: null, cancelReason: null,
      linkedFromId: oldId, linkedToId: null,
      siblingGroupId: null,
    }
    s.applications = [...s.applications, newApp]
    s.audit_log = [...s.audit_log,
      { id: uid('au'), actorId: byUserId, action: 'APPLICATION_CANCELLED', targetId: oldId, at, meta: { reason, linkedTo: newId } },
      { id: uid('au'), actorId: byUserId, action: 'APPLICATION_SUBMITTED', targetId: newId, at, meta: { linkedFrom: oldId } },
    ]
    const council = s.users.filter(u => u.role === 'ScientificCouncil')
    council.forEach(c => {
      s.notifications = [...s.notifications, {
        id: uid('n'), userId: c.id, type: 'StatusChange',
        title: 'Линкувана апликација за ревизија',
        body: newData.conference + ' — заменува поништена.',
        at, read: false,
      }]
    })
    if (oldAdvance && acctId) {
      s.notifications = [...s.notifications, {
        id: uid('n'), userId: acctId, type: 'StatusChange',
        title: 'Аванс — потребна рачна потврда за враќање',
        body: 'Поништена апликација со исплатен аванс ' + oldAdvance + ' МКД.',
        at, read: false,
      }]
    }
    return s
  })

  if (hasBackend) {
    bgWrite('cancelAndLinkApplication', (async () => {
      await supabase.from('applications').update({
        status: 'Cancelled', cancelled_at: at, cancel_reason: reason, linked_to_id: newId,
      }).eq('id', oldId)
      const ins = await supabase.from('applications').insert({
        id: newId,
        applicant_id: _state.applications.find(a => a.id === newId)?.applicantId,
        conference: newData.conference,
        conference_url: newData.conferenceUrl ?? null,
        location: newData.location,
        date_from: newData.from,
        date_to: newData.to,
        requested_amount: Number(newData.requestedAmount),
        status: 'Submitted',
        phase: 'ScientificCouncil',
        linked_from_id: oldId,
        submitted_at: at,
      })
      if (ins.error) return ins
      await supabase.from('audit_log').insert([
        { actor_id: byUserId, action: 'APPLICATION_CANCELLED', target_id: oldId, meta: { reason, linkedTo: newId } },
        { actor_id: byUserId, action: 'APPLICATION_SUBMITTED', target_id: newId, meta: { linkedFrom: oldId } },
      ])
      const council = _state.users.filter(u => u.role === 'ScientificCouncil')
      const notifs = council.map(c => ({
        user_id: c.id, type: 'StatusChange',
        title: 'Линкувана апликација за ревизија',
        body: newData.conference + ' — заменува поништена.',
      }))
      if (oldAdvance && acctId) notifs.push({
        user_id: acctId, type: 'StatusChange',
        title: 'Аванс — потребна рачна потврда за враќање',
        body: 'Поништена апликација со исплатен аванс ' + oldAdvance + ' МКД.',
      })
      if (notifs.length) await supabase.from('notifications').insert(notifs)
      return ins
    })())
  }

  return newId
}

export function submitExpenseReport(data) {
  const id = crypto.randomUUID()
  const at = nowIso()
  let appConference = ''
  let acctId = accountingUserId()

  applyLocal(s => {
    const er = {
      id, applicationId: data.applicationId, applicantId: data.applicantId,
      daysAway: data.daysAway, perDiemRate: data.perDiemRate, perDiemTotal: data.perDiemTotal,
      transport: data.transport, accommodation: data.accommodation,
      registration: data.registration, other: data.other,
      realTotal: data.realTotal, late: data.late ?? false,
      status: 'AwaitingReconciliation', submittedAt: at,
      receipts: data.receipts ?? [],
    }
    s.expense_reports = [...s.expense_reports, er]
    const app = s.applications.find(a => a.id === data.applicationId)
    if (app) {
      app.status = 'AwaitingReconciliation'
      appConference = app.conference
    }
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: data.applicantId, action: 'EXPENSE_REPORT_SUBMIT',
      targetId: id, at,
    }]
    if (acctId) {
      s.notifications = [...s.notifications, {
        id: uid('n'), userId: acctId, type: 'StatusChange',
        title: 'Извештај за порамнување',
        body: appConference + ' — извештајот чека порамнување.',
        at, read: false,
      }]
    }
    return s
  })

  if (hasBackend) {
    bgWrite('submitExpenseReport', (async () => {
      const ins = await supabase.from('expense_reports').insert({
        id,
        application_id: data.applicationId,
        applicant_id: data.applicantId,
        days_away: data.daysAway,
        per_diem_rate: data.perDiemRate,
        per_diem_total: data.perDiemTotal,
        transport: data.transport,
        accommodation: data.accommodation,
        registration: data.registration,
        other: data.other,
        real_total: data.realTotal,
        status: 'AwaitingReconciliation',
        late: data.late ?? false,
        submitted_at: at,
      })
      if (ins.error) return ins
      await supabase.from('applications')
        .update({ status: 'AwaitingReconciliation' })
        .eq('id', data.applicationId)
      await supabase.from('audit_log').insert({
        actor_id: data.applicantId, action: 'EXPENSE_REPORT_SUBMIT', target_id: id,
      })
      if (acctId) await supabase.from('notifications').insert({
        user_id: acctId, type: 'StatusChange',
        title: 'Извештај за порамнување',
        body: appConference + ' — извештајот чека порамнување.',
      })
      return ins
    })())
  }

  return id
}

export function reconcileReport({ reportId, byUserId, outcome, outcomeAmount, comment }) {
  const at = nowIso()
  let applicantIdLocal = null

  applyLocal(s => {
    const er = s.expense_reports.find(r => r.id === reportId)
    if (!er) return s
    er.status = 'Reconciled'
    er.reconciledAt = at
    er.reconciledById = byUserId
    er.outcome = outcome
    er.outcomeAmount = outcomeAmount
    er.reconciliationComment = comment ?? null
    applicantIdLocal = er.applicantId
    const app = s.applications.find(a => a.id === er.applicationId)
    if (app) app.status = 'Completed'
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: byUserId, action: 'RECONCILED',
      targetId: reportId, at, meta: { outcome, outcomeAmount },
    }]
    s.notifications = [...s.notifications, {
      id: uid('n'), userId: er.applicantId, type: 'StatusChange',
      title: 'Извештајот е порамнет',
      body: outcome === 'TOPUP' ? 'Доплата: ' + outcomeAmount + ' МКД.'
          : outcome === 'REFUND' ? 'Поврат во буџет: ' + outcomeAmount + ' МКД.'
          : 'Без финансиска корекција.',
      at, read: false,
    }]
    return s
  })

  if (hasBackend) {
    bgWrite('reconcileReport', (async () => {
      const upd = await supabase.from('expense_reports').update({
        status: 'Reconciled',
        reconciled_at: at,
        reconciled_by_id: byUserId,
        outcome,
        outcome_amount: outcomeAmount,
        reconciliation_comment: comment ?? null,
      }).eq('id', reportId)
      if (upd.error) return upd
      const er = _state.expense_reports.find(r => r.id === reportId)
      if (er?.applicationId) {
        await supabase.from('applications')
          .update({ status: 'Completed' }).eq('id', er.applicationId)
      }
      await supabase.from('audit_log').insert({
        actor_id: byUserId, action: 'RECONCILED', target_id: reportId,
        meta: { outcome, outcomeAmount },
      })
      if (applicantIdLocal) await supabase.from('notifications').insert({
        user_id: applicantIdLocal, type: 'StatusChange',
        title: 'Извештајот е порамнет',
        body: outcome === 'TOPUP' ? 'Доплата: ' + outcomeAmount + ' МКД.'
            : outcome === 'REFUND' ? 'Поврат во буџет: ' + outcomeAmount + ' МКД.'
            : 'Без финансиска корекција.',
      })
      return upd
    })())
  }
}

export function transferAnnualLimit({ fromUserId, toUserId, amount, approverId }) {
  let fromLimit = null, toLimit = null
  applyLocal(s => {
    const a = s.users.find(u => u.id === fromUserId)
    const b = s.users.find(u => u.id === toUserId)
    if (!a || !b) return s
    a.annualLimit = Math.max(0, a.annualLimit - amount)
    b.annualLimit += amount
    fromLimit = a.annualLimit; toLimit = b.annualLimit
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: approverId, action: 'BUDGET_TRANSFER',
      targetId: fromUserId, at: nowIso(), meta: { fromUserId, toUserId, amount },
    }]
    return s
  })

  if (hasBackend && fromLimit !== null) {
    bgWrite('transferAnnualLimit', (async () => {
      await supabase.from('users').update({ annual_limit: fromLimit }).eq('id', fromUserId)
      await supabase.from('users').update({ annual_limit: toLimit }).eq('id', toUserId)
      const ins = await supabase.from('audit_log').insert({
        actor_id: approverId, action: 'BUDGET_TRANSFER',
        target_id: fromUserId, meta: { fromUserId, toUserId, amount },
      })
      return ins
    })())
  }
}

export function payAdvance({ applicationId, amount, byUserId }) {
  const at = nowIso()
  let applicantIdLocal = null
  let confLocal = ''
  applyLocal(s => {
    const app = s.applications.find(a => a.id === applicationId)
    if (!app) return s
    app.advancePaid = amount
    app.status = 'AdvancePaid'
    applicantIdLocal = app.applicantId
    confLocal = app.conference
    s.audit_log = [...s.audit_log, {
      id: uid('au'), actorId: byUserId, action: 'ADVANCE_PAID',
      targetId: applicationId, at, meta: { amount },
    }]
    s.notifications = [...s.notifications, {
      id: uid('n'), userId: app.applicantId, type: 'StatusChange',
      title: 'Авансот е исплатен',
      body: app.conference + ' — ' + amount + ' МКД.',
      at, read: false,
    }]
    return s
  })

  if (hasBackend) {
    bgWrite('payAdvance', (async () => {
      const upd = await supabase.from('applications').update({
        advance_paid: amount, status: 'AdvancePaid',
      }).eq('id', applicationId)
      if (upd.error) return upd
      await supabase.from('audit_log').insert({
        actor_id: byUserId, action: 'ADVANCE_PAID',
        target_id: applicationId, meta: { amount },
      })
      if (applicantIdLocal) await supabase.from('notifications').insert({
        user_id: applicantIdLocal, type: 'StatusChange',
        title: 'Авансот е исплатен',
        body: confLocal + ' — ' + amount + ' МКД.',
      })
      return upd
    })())
  }
}

/* Legacy localStorage reset — kept as a no-op so any stray callers don't crash. */
export function resetState() {
  return _state
}
