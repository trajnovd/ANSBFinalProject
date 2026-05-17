import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth.jsx'
import { getState, reconcileReport, subscribe } from '../lib/store.js'
import { formatDate, formatDateTime, formatMoney } from '../lib/format.js'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Textarea } from '../components/ui.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Reconciliation() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])

  const queue = useMemo(() => s.expense_reports.filter(r => r.status === 'AwaitingReconciliation'), [s])
  const [openId, setOpenId] = useState(null)
  const [comment, setComment] = useState('')

  const active = queue.find(r => r.id === openId)
  const activeApp = active ? s.applications.find(a => a.id === active.applicationId) : null
  const activeUser = active ? s.users.find(u => u.id === active.applicantId) : null
  const diff = activeApp && active ? active.realTotal - (activeApp.advancePaid ?? 0) : 0
  const outcome = diff > 0 ? 'TOPUP' : diff < 0 ? 'REFUND' : 'EVEN'

  function approve() {
    reconcileReport({
      reportId: openId, byUserId: user.id,
      outcome, outcomeAmount: Math.abs(diff), comment: comment.trim() || null,
    })
    toast.show(t('uc05.approveOutcomeToast'), 'success')
    setOpenId(null); setComment('')
  }

  return (
    <>
      <PageHeader title={t('uc05.title')} subtitle={t('uc05.subtitle')}>
        <Badge tone="warning">Human-in-the-loop · FR-024</Badge>
      </PageHeader>

      <Card title="Редица за порамнување">
        {queue.length === 0 ? (
          <EmptyState title={t('uc05.noPending')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map(r => {
              const a = s.applications.find(a => a.id === r.applicationId)
              const u = s.users.find(u => u.id === r.applicantId)
              const d = r.realTotal - (a?.advancePaid ?? 0)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--color-surface-muted)', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{a?.conference}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {u?.firstName + ' ' + u?.lastName} · поднесено {formatDateTime(r.submittedAt)}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 14, fontSize: 13 }}>
                      <span>Аванс: <strong className="mono">{formatMoney(a?.advancePaid ?? 0)}</strong></span>
                      <span>Реални: <strong className="mono">{formatMoney(r.realTotal)}</strong></span>
                      <span>Разлика: <strong className="mono" style={{ color: d > 0 ? 'var(--color-warning)' : d < 0 ? 'var(--color-success)' : 'var(--color-text)' }}>{(d >= 0 ? '+' : '') + formatMoney(d)}</strong></span>
                    </div>
                  </div>
                  <Button onClick={() => setOpenId(r.id)}>Прегледај и порамни</Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal open={!!active} onClose={() => setOpenId(null)} width={620}
        title="Рачно одобрување на порамнување" footer={
          <>
            <Button variant="secondary" onClick={() => setOpenId(null)}>{t('common.cancel')}</Button>
            <Button variant="success" onClick={approve}>✓ {t('uc05.humanApproval')}</Button>
          </>
        }>
        {active && activeApp && activeUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <strong>{activeApp.conference}</strong> · {activeApp.location}
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{activeUser.firstName + ' ' + activeUser.lastName} · {formatDate(activeApp.from)} → {formatDate(activeApp.to)}</div>
            </div>
            <div className="two-col" style={{ gap: 12 }}>
              <Row label={t('uc05.advance')} value={formatMoney(activeApp.advancePaid)} />
              <Row label={t('uc05.realCost')} value={formatMoney(active.realTotal)} />
              <Row label="Дневници" value={formatMoney(active.perDiemTotal)} />
              <Row label="Транспорт" value={formatMoney(active.transport)} />
              <Row label="Сместување" value={formatMoney(active.accommodation)} />
              <Row label="Котизација" value={formatMoney(active.registration)} />
              <Row label="Други" value={formatMoney(active.other)} />
              <Row label={t('uc05.difference')} value={(diff >= 0 ? '+' : '') + formatMoney(diff)} bold tone={diff > 0 ? 'warning' : diff < 0 ? 'success' : 'neutral'} />
            </div>
            <div style={{ padding: 12, background: 'var(--color-info-soft)', borderRadius: 6, fontSize: 14 }}>
              <strong>{t('uc05.outcome')}: </strong>
              {outcome === 'TOPUP' && t('uc05.outcomeDoplata') + ' — ' + formatMoney(Math.abs(diff))}
              {outcome === 'REFUND' && t('uc05.outcomePovrat') + ' — ' + formatMoney(Math.abs(diff))}
              {outcome === 'EVEN' && t('uc05.outcomeEven')}
            </div>
            <Field label={t('common.comment')}>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Опционален коментар за ревизорската трага" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}

function Row({ label, value, bold, tone }) {
  const color = tone === 'warning' ? 'var(--color-warning)' : tone === 'success' ? 'var(--color-success)' : 'var(--color-text)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: bold ? 700 : 400, color }}>{value}</span>
    </div>
  )
}
