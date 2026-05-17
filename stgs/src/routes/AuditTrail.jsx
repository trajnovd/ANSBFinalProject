import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getState, subscribe } from '../lib/store.js'
import { formatDateTime } from '../lib/format.js'
import { Badge, Card, DataTable, EmptyState, Input, PageHeader, Select } from '../components/ui.jsx'

const ACTIONS = [
  'APPLICATION_DRAFTED', 'APPLICATION_SUBMITTED', 'APPLICATION_CANCELLED',
  'APPROVAL_RECORDED', 'EXPENSE_REPORT_SUBMIT', 'RECONCILED',
  'ADVANCE_PAID', 'BUDGET_TRANSFER', 'LOGIN', 'UNAUTHORIZED_ATTEMPT',
]

export default function AuditTrail() {
  const { t } = useTranslation()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])
  const [actorFilter, setActorFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    let r = s.audit_log.slice().sort((a, b) => b.at.localeCompare(a.at))
    if (actorFilter) r = r.filter(x => x.actorId === actorFilter)
    if (actionFilter) r = r.filter(x => x.action === actionFilter)
    if (q) {
      const ql = q.toLowerCase()
      r = r.filter(x => (x.targetId ?? '').toLowerCase().includes(ql) || (x.action ?? '').toLowerCase().includes(ql))
    }
    return r
  }, [s, actorFilter, actionFilter, q])

  return (
    <>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')}>
        <Badge tone="primary">Append-only</Badge>
        <Badge tone="primary">AES-256 at rest</Badge>
        <Badge tone="primary">TLS 1.2+ in transit</Badge>
      </PageHeader>

      <Card>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <Input placeholder={t('common.search') + ': target ID или action…'} value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 360 }} />
          <Select value={actorFilter} onChange={e => setActorFilter(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">— {t('audit.filterByActor')} —</option>
            {s.users.map(u => <option key={u.id} value={u.id}>{u.firstName + ' ' + u.lastName} ({t('roles.' + u.role)})</option>)}
          </Select>
          <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">— {t('audit.filterByAction')} —</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <div style={{ flex: 1 }} />
          <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>{t('common.totalRecords', { count: rows.length })}</span>
        </div>

        <DataTable
          columns={[
            { key: 'at', label: t('audit.timestamp'), render: r => <span className="mono">{formatDateTime(r.at)}</span> },
            { key: 'actor', label: t('audit.actor'), render: r => {
              const u = s.users.find(u => u.id === r.actorId)
              return u ? (
                <span>{u.firstName + ' ' + u.lastName}<br/>
                  <Badge tone="neutral" style={{ fontSize: 10 }}>{t('roles.' + u.role)}</Badge>
                </span>
              ) : <span className="mono">{r.actorId}</span>
            } },
            { key: 'action', label: t('audit.action'), render: r => <Badge tone={toneFor(r.action)}><span className="mono">{r.action}</span></Badge> },
            { key: 'target', label: t('audit.target'), render: r => <span className="mono">{r.targetId}</span> },
            { key: 'meta', label: 'Мета', render: r => r.meta ? <pre style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>{JSON.stringify(r.meta)}</pre> : '—' },
          ]}
          rows={rows.map((r, i) => ({ ...r, id: r.id ?? i }))}
          empty={<EmptyState title={t('common.noResults')} />}
        />
      </Card>
    </>
  )
}

function toneFor(action) {
  if (action.includes('CANCELLED') || action.includes('UNAUTHORIZED')) return 'danger'
  if (action.includes('APPROVAL') || action.includes('RECONCILED')) return 'success'
  if (action.includes('ADVANCE') || action.includes('BUDGET')) return 'warning'
  return 'info'
}
