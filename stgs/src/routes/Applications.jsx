import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe } from '../lib/store.js'
import { formatMoney, formatDate } from '../lib/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Button, Card, DataTable, EmptyState, Input, PageHeader, Select } from '../components/ui.jsx'

export default function Applications() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const apps = useMemo(() => {
    let list = s.applications
    if (user.role === 'Applicant') list = list.filter(a => a.applicantId === user.id)
    if (q) {
      const ql = q.toLowerCase()
      list = list.filter(a => a.conference.toLowerCase().includes(ql) || a.location.toLowerCase().includes(ql))
    }
    if (statusFilter) list = list.filter(a => a.status === statusFilter)
    return list.slice().sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
  }, [s, user.id, q, statusFilter])

  const cols = [
    { key: 'conference', label: 'Конференција', render: r => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.conference}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.location}</div>
        </div>
    ) },
    ...(user.role !== 'Applicant' ? [
      { key: 'applicant', label: t('roles.Applicant'), render: r => {
          const u = s.users.find(u => u.id === r.applicantId)
          return <span>{u ? (u.firstName + ' ' + u.lastName) : '—'}</span>
      } },
    ] : []),
    { key: 'period', label: 'Период', render: r => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(r.from)} → {formatDate(r.to)}</span> },
    { key: 'amount', label: 'Износ', render: r => <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(r.requestedAmount)}</span> },
    { key: 'status', label: 'Статус', render: r => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader title={t('nav.applications')} subtitle={user.role === 'Applicant' ? 'Твоите апликации за грант.' : 'Сите апликации во системот.'}>
        {user.role === 'Applicant' && (
          <Link to="/applications/new"><Button>+ {t('nav.newApplication')}</Button></Link>
        )}
      </PageHeader>

      <Card>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <Input placeholder={t('common.search')} value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">— {t('common.all')} —</option>
            {['Draft','Submitted','InReview','Returned','Approved','Rejected','Cancelled','AdvancePaid','AwaitingReconciliation','Completed'].map(s => (
              <option key={s} value={s}>{t('status.' + s)}</option>
            ))}
          </Select>
          <div style={{ flex: 1 }} />
          <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>{t('common.totalRecords', { count: apps.length })}</span>
        </div>
        <DataTable
          columns={cols}
          rows={apps.map(a => ({ ...a, id: a.id }))}
          onRowClick={r => { window.location.hash = ''; window.location.href = '/applications/' + r.id }}
          empty={<EmptyState title={t('common.noResults')} hint={user.role === 'Applicant' ? 'Започни со нова апликација.' : ''} />}
        />
      </Card>
    </>
  )
}
