import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe } from '../lib/store.js'
import { formatMoney, formatDate, formatDateTime, hoursSince } from '../lib/format.js'
import { Badge, Button, Card, DataTable, EmptyState, PageHeader } from '../components/ui.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

export default function ExpenseReports() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])

  const isApplicant = user.role === 'Applicant'

  const eligibleApps = useMemo(() => {
    if (!isApplicant) return []
    return s.applications.filter(a =>
      a.applicantId === user.id && a.status === 'AdvancePaid' &&
      !s.expense_reports.some(r => r.applicationId === a.id)
    )
  }, [s, user.id, isApplicant])

  const myReports = useMemo(() => {
    if (isApplicant) return s.expense_reports.filter(r => r.applicantId === user.id)
    return s.expense_reports
  }, [s, user.id, isApplicant])

  return (
    <>
      <PageHeader title={t('uc04.title')} subtitle={t('uc04.subtitle')} />

      {isApplicant && eligibleApps.length > 0 && (
        <Card title="Може да поднесеш извештај за следниве патувања">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {eligibleApps.map(a => {
              const hours = hoursSince(a.to + 'T00:00:00')
              const late = hours > 48
              return (
                <Link key={a.id} to={'/reports/new/' + a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 6,
                  background: late ? 'var(--color-danger-soft)' : 'var(--color-surface-muted)',
                  textDecoration: 'none', color: 'inherit',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{a.conference}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                      Враќање: {formatDate(a.to)} · Аванс: {formatMoney(a.advancePaid)}
                    </div>
                  </div>
                  {late ? <Badge tone="danger">Доцен ({hours - 48}ч по рокот)</Badge> : <Badge tone="warning">{Math.max(0, 48 - hours)}ч до рокот</Badge>}
                  <Button size="sm">Поднеси</Button>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      <div style={{ height: 18 }} />

      <Card title="Поднесени извештаи">
        <DataTable
          columns={[
            { key: 'conf', label: 'Конференција', render: r => {
              const a = s.applications.find(a => a.id === r.applicationId)
              return <div><div style={{ fontWeight: 500 }}>{a?.conference}</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a?.location}</div></div>
            } },
            ...(!isApplicant ? [{ key: 'applicant', label: t('roles.Applicant'), render: r => {
              const u = s.users.find(u => u.id === r.applicantId)
              return u ? u.firstName + ' ' + u.lastName : '—'
            } }] : []),
            { key: 'submitted', label: 'Поднесено', render: r => formatDateTime(r.submittedAt) },
            { key: 'real', label: 'Реални трошоци', render: r => <span className="mono">{formatMoney(r.realTotal)}</span> },
            { key: 'status', label: 'Статус', render: r => {
              if (r.status === 'AwaitingReconciliation') return <Badge tone="warning">Чека порамнување</Badge>
              if (r.status === 'Reconciled') return <Badge tone="success">Порамнето</Badge>
              return <Badge>{r.status}</Badge>
            } },
            { key: 'outcome', label: 'Резултат', render: r => {
              if (!r.outcome) return '—'
              if (r.outcome === 'TOPUP') return <Badge tone="info">Доплата: {formatMoney(r.outcomeAmount)}</Badge>
              if (r.outcome === 'REFUND') return <Badge tone="warning">Поврат: {formatMoney(r.outcomeAmount)}</Badge>
              return <Badge>Без корекција</Badge>
            } },
          ]}
          rows={myReports}
          empty={<EmptyState title="Сè уште нема извештаи." />}
        />
      </Card>
    </>
  )
}
