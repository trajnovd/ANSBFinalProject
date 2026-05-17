import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe, recordApprovalDecision, payAdvance } from '../lib/store.js'
import { formatMoney, formatDate, formatDateTime } from '../lib/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui.jsx'
import { useToast } from '../components/Toast.jsx'

export default function ApplicationDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])

  const app = s.applications.find(a => a.id === id)
  const applicant = app ? s.users.find(u => u.id === app.applicantId) : null
  const linkedFrom = app?.linkedFromId ? s.applications.find(a => a.id === app.linkedFromId) : null
  const linkedTo = app?.linkedToId ? s.applications.find(a => a.id === app.linkedToId) : null
  const auditFor = useMemo(() => s.audit_log.filter(a => a.targetId === id).sort((a, b) => b.at.localeCompare(a.at)), [s, id])

  const [decision, setDecision] = useState(null) // 'APPROVED' | 'REJECTED' | 'RETURNED'
  const [comment, setComment] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')

  if (!app) {
    return <PageHeader title="—" subtitle={t('common.noData')} />
  }

  const canDecide = (
    (user.role === 'ScientificCouncil' && app.phase === 'ScientificCouncil' && ['Submitted', 'InReview'].includes(app.status)) ||
    (user.role === 'DeanOffice' && app.phase === 'DeanOffice' && app.status === 'InReview')
  )

  const canCancel = user.role === 'Applicant' && user.id === app.applicantId && ['Approved', 'AdvancePaid'].includes(app.status)
  const canSubmitReport = user.role === 'Applicant' && user.id === app.applicantId && app.status === 'AdvancePaid'
  const canPayAdvance = user.role === 'Accounting' && app.status === 'Approved' && !app.advancePaid

  function submitDecision() {
    if (!decision) return
    if ((decision === 'REJECTED' || decision === 'RETURNED') && !comment.trim()) {
      toast.show(t('uc02.commentRequired'), 'danger')
      return
    }
    recordApprovalDecision({ applicationId: app.id, byUserId: user.id, decision, comment: comment.trim() || null })
    toast.show(
      decision === 'APPROVED' ? t('uc02.approvedToast') :
      decision === 'REJECTED' ? t('uc02.rejectedToast') :
      t('uc02.returnedToast'),
      decision === 'REJECTED' ? 'danger' : decision === 'RETURNED' ? 'warning' : 'success'
    )
    setDecision(null); setComment('')
  }

  function confirmAdvance() {
    const amt = Number(payAmount)
    if (!amt || amt <= 0) { toast.show('Невалиден износ', 'danger'); return }
    payAdvance({ applicationId: app.id, amount: amt, byUserId: user.id })
    toast.show('Авансот е исплатен.', 'success')
    setPayOpen(false); setPayAmount('')
  }

  return (
    <>
      <PageHeader title={app.conference} subtitle={app.location + ' · ' + formatDate(app.from) + ' → ' + formatDate(app.to)}>
        <Button variant="ghost" onClick={() => nav(-1)}>← {t('common.back')}</Button>
        {canCancel && (
          <Link to={'/applications/' + app.id + '/cancel'}>
            <Button variant="secondary">Откажи и поднеси нова</Button>
          </Link>
        )}
        {canSubmitReport && (
          <Link to={'/reports/new/' + app.id}>
            <Button>Поднеси извештај</Button>
          </Link>
        )}
        {canPayAdvance && (
          <Button onClick={() => { setPayOpen(true); setPayAmount(String(app.requestedAmount)) }}>Исплати аванс</Button>
        )}
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Преглед">
            <Grid>
              <Item label="Статус"><StatusBadge status={app.status} /></Item>
              <Item label="Тековна фаза">{t('phase.' + app.phase)}</Item>
              <Item label="Апликант">{applicant ? (applicant.title ? applicant.title + ' ' : '') + applicant.firstName + ' ' + applicant.lastName : '—'}</Item>
              <Item label="Тип апликант">{t('applicantType.' + (applicant?.applicantType ?? 'FINKI_Staff'))}</Item>
              <Item label="Побаран износ">{formatMoney(app.requestedAmount)}</Item>
              <Item label="Аванс">{app.advancePaid ? formatMoney(app.advancePaid) : '—'}</Item>
              <Item label="Поднесено">{formatDateTime(app.submittedAt)}</Item>
              <Item label="ID">{app.id}</Item>
              {linkedFrom && <Item label="Линкувана од"><Link to={'/applications/' + linkedFrom.id}>{linkedFrom.conference}</Link></Item>}
              {linkedTo && <Item label="Линкувана кон"><Link to={'/applications/' + linkedTo.id}>{linkedTo.conference}</Link></Item>}
              {app.cancelReason && <Item label="Причина за откажување" full>{app.cancelReason}</Item>}
            </Grid>
          </Card>

          <Card title="Документи">
            {app.documents.length === 0 ? <div style={{ color: 'var(--color-text-muted)' }}>Нема прикачени документи.</div> :
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {app.documents.map(d => (
                  <li key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>📎</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{d.fileName}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          <Badge tone="primary" style={{ marginRight: 6 }}>{t('docType.' + d.type)}</Badge>
                          {d.isShared && <Badge tone="accent">Заеднички (sibling)</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">{t('common.download')}</Button>
                  </li>
                ))}
              </ul>
            }
          </Card>

          <Card title="Историја на одобрување">
            {app.approvals.length === 0 ? <div style={{ color: 'var(--color-text-muted)' }}>Сè уште без донесени одлуки.</div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {app.approvals.map(ap => {
                  const by = s.users.find(u => u.id === ap.byId)
                  return (
                    <div key={ap.id} style={{ display: 'flex', gap: 10, padding: 10, background: 'var(--color-surface-muted)', borderRadius: 6 }}>
                      <Badge tone={ap.decision === 'APPROVED' ? 'success' : ap.decision === 'REJECTED' ? 'danger' : 'warning'}>
                        {t('decision.' + ap.decision)}
                      </Badge>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>
                          <strong>{t('phase.' + ap.phase)}</strong> · {by ? (by.firstName + ' ' + by.lastName) : '—'} · <span style={{ color: 'var(--color-text-subtle)' }}>{formatDateTime(ap.at)}</span>
                        </div>
                        {ap.comment && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>“{ap.comment}”</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </Card>

          {canDecide && (
            <Card title={t('uc02.decideTitle')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Select value={decision ?? ''} onChange={e => setDecision(e.target.value || null)}>
                  <option value="">— Избери одлука —</option>
                  <option value="APPROVED">✓ {t('decision.APPROVED')}</option>
                  <option value="REJECTED">✕ {t('decision.REJECTED')}</option>
                  <option value="RETURNED">↺ {t('decision.RETURNED')}</option>
                </Select>
                <Field label={t('common.comment')} required={decision !== 'APPROVED' && decision !== null} hint={decision === 'APPROVED' ? 'Опционално' : t('uc02.commentRequired')}>
                  <Textarea value={comment} onChange={e => setComment(e.target.value)} />
                </Field>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => { setDecision(null); setComment('') }}>{t('common.cancel')}</Button>
                  <Button onClick={submitDecision} disabled={!decision}>{t('common.confirm')}</Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Ревизорска трага" subtitle="Append-only · NFR-001">
            {auditFor.length === 0 ? <div style={{ color: 'var(--color-text-muted)' }}>—</div> :
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5 }}>
                {auditFor.map(a => {
                  const u = s.users.find(u => u.id === a.actorId)
                  return (
                    <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div className="mono" style={{ color: 'var(--color-primary)' }}>{a.action}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>{u ? (u.firstName + ' ' + u.lastName) : '—'} · {formatDateTime(a.at)}</div>
                    </li>
                  )
                })}
              </ul>
            }
          </Card>
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Исплата на аванс" footer={
        <>
          <Button variant="secondary" onClick={() => setPayOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={confirmAdvance}>Потврди исплата</Button>
        </>
      }>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Сите финансиски акции бараат рачно потврдување (FR-024). Внесете го износот за исплата.
        </p>
        <Field label="Износ (МКД)" required>
          <Input type="number" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
        </Field>
      </Modal>
    </>
  )
}

function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>{children}</div>
}

function Item({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 13.5 }}>{children}</div>
    </div>
  )
}
