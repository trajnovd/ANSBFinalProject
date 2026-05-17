import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe } from '../lib/store.js'
import { formatMoney, formatDate, relativeTime } from '../lib/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Badge, Button, Card, DataTable, EmptyState, PageHeader } from '../components/ui.jsx'

export default function Approvals() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])

  const queue = useMemo(() => {
    if (user.role === 'ScientificCouncil') {
      return s.applications.filter(a => a.phase === 'ScientificCouncil' && ['Submitted', 'InReview'].includes(a.status))
    }
    if (user.role === 'DeanOffice') {
      return s.applications.filter(a => a.phase === 'DeanOffice' && a.status === 'InReview')
    }
    return []
  }, [s, user.role])

  const myDecisions = useMemo(() =>
    s.applications.flatMap(a =>
      a.approvals.filter(ap => ap.byId === user.id).map(ap => ({ ...ap, application: a }))
    ).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10),
  [s, user.id])

  const queueCols = [
    { key: 'conf', label: 'Конференција', render: r => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.conference}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.location}</div>
      </div>
    ) },
    { key: 'applicant', label: t('roles.Applicant'), render: r => {
      const u = s.users.find(u => u.id === r.applicantId)
      return <span>{u ? (u.title ? u.title + ' ' : '') + u.firstName + ' ' + u.lastName : '—'}</span>
    } },
    { key: 'period', label: 'Период', render: r => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(r.from)} → {formatDate(r.to)}</span> },
    { key: 'amount', label: 'Износ', render: r => <span className="mono">{formatMoney(r.requestedAmount)}</span> },
    { key: 'status', label: 'Статус', render: r => <StatusBadge status={r.status} /> },
    { key: 'action', label: '', render: r => <Link to={'/applications/' + r.id}><Button size="sm">{t('common.viewDetails')}</Button></Link> },
  ]

  return (
    <>
      <PageHeader title={t('uc02.title')} subtitle={t('uc02.subtitle')}>
        <Badge tone="primary">{t('uc02.currentPhase')}: {t('phase.' + (user.role === 'ScientificCouncil' ? 'ScientificCouncil' : 'DeanOffice'))}</Badge>
      </PageHeader>

      <Card title={t('uc02.queue')} subtitle={queue.length === 0 ? t('uc02.noPending') : undefined}>
        <DataTable
          columns={queueCols}
          rows={queue}
          empty={<EmptyState title={t('uc02.noPending')} hint="Сите се одобрени." />}
        />
      </Card>

      <div style={{ height: 18 }} />

      <Card title={t('uc02.myDecisions')}>
        {myDecisions.length === 0 ? (
          <EmptyState title={t('common.noResults')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myDecisions.map(d => (
              <Link key={d.id} to={'/applications/' + d.application.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 6, background: 'var(--color-surface-muted)', textDecoration: 'none', color: 'inherit' }}>
                <Badge tone={d.decision === 'APPROVED' ? 'success' : d.decision === 'REJECTED' ? 'danger' : 'warning'}>
                  {t('decision.' + d.decision)}
                </Badge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{d.application.conference}</div>
                  {d.comment && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>“{d.comment}”</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{relativeTime(d.at)}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
