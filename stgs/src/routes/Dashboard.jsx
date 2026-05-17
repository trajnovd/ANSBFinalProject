import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe } from '../lib/store.js'
import { formatMoney, formatDate, relativeTime, hoursSince } from '../lib/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { Button, Card, Stat, EmptyState, Badge, PageHeader, SectionHeader, IconBox } from '../components/ui.jsx'
import * as I from '../components/icons.jsx'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])
  const view = useMemo(() => buildView(s, user, t), [s, user?.id, t])

  const today = new Intl.DateTimeFormat('mk-MK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={t('dashboard.welcome', { name: user.firstName })}
        subtitle={view.subtitle}>
        {view.headerAction}
      </PageHeader>

      <div className="reveal reveal-2" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 28,
      }}>
        {view.stats.map(st => <Stat key={st.label} {...st} />)}
      </div>

      <div className="reveal reveal-3" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20 }}>
        <Card title={view.listTitle} subtitle={view.listSubtitle} action={view.listAction}>
          {view.list.length === 0 ? (
            <EmptyState
              icon={<I.FileText size={20} />}
              title={t('common.noResults')}
              hint={view.emptyHint} />
          ) : (
            <div>
              {view.list.map((row, i) => (
                <DashboardRow key={row.key} row={row} isLast={i === view.list.length - 1} />
              ))}
            </div>
          )}
        </Card>

        <Card title={t('dashboard.recentActivity')} subtitle={t('common.totalRecords', { count: view.activity.length })}>
          {view.activity.length === 0 ? (
            <EmptyState icon={<I.Bell size={20} />} title={t('dashboard.noActivity')} />
          ) : (
            <div>
              {view.activity.slice(0, 8).map((a, i) => (
                <div key={a.id} style={{
                  padding: '10px 0',
                  borderBottom: i < Math.min(view.activity.length, 8) - 1 ? '1px solid var(--border-soft)' : 'none',
                  display: 'flex', gap: 10,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: 'var(--accent)',
                    marginTop: 7, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--fg-soft)' }}>{a.text}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 3 }}>{relativeTime(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

function DashboardRow({ row, isLast }) {
  return (
    <Link to={row.to} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
      textDecoration: 'none', color: 'inherit',
      margin: '0 -2px',
      paddingLeft: 2, paddingRight: 2,
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
    onMouseLeave={e => { e.currentTarget.style.background = '' }}>
      {row.icon && <IconBox icon={row.icon} tone={row.iconTone ?? 'neutral'} size={36} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500, color: 'var(--fg)',
          letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{row.title}</div>
        <div style={{
          fontSize: 12, color: 'var(--fg-muted)',
          marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{row.subtitle}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {row.badge}
        {row.right && <span className="mono" style={{ fontSize: 12, color: 'var(--fg-soft)' }}>{row.right}</span>}
      </div>
      <I.ChevronRight size={14} style={{ color: 'var(--fg-faint)', flexShrink: 0 }} />
    </Link>
  )
}

function buildView(state, user, t) {
  const role = user.role
  const apps = state.applications
  const myApps = apps.filter(a => a.applicantId === user.id)
  const myUsed = myApps.filter(a => ['Approved','AdvancePaid','AwaitingReconciliation','Completed'].includes(a.status))
    .reduce((sum, a) => sum + a.requestedAmount, 0)
  const remaining = (user.annualLimit ?? 0) - myUsed

  if (role === 'Applicant') {
    return {
      subtitle: t('roles.Applicant') + ' · ' + (user.title ? user.title + ' ' : '') + user.firstName + ' ' + user.lastName,
      headerAction: <Link to="/applications/new"><Button icon={<I.Plus size={14} />}>{t('nav.newApplication')}</Button></Link>,
      stats: [
        { label: t('dashboard.yourApplications'), value: myApps.filter(a => !['Cancelled','Rejected','Completed'].includes(a.status)).length, icon: <I.FileText size={16} />, tone: 'info' },
        { label: t('uc06.completedCount'), value: myApps.filter(a => a.status === 'Completed').length, icon: <I.CheckCircle size={16} />, tone: 'success' },
        { label: t('uc01.annualLimit'), value: formatMoney(user.annualLimit), icon: <I.Wallet size={16} />, tone: 'primary' },
        { label: t('dashboard.remaining'), value: formatMoney(remaining), icon: <I.DollarSign size={16} />, tone: remaining < 50000 ? 'warning' : 'success', hint: pct(myUsed, user.annualLimit) + ' искористено' },
      ],
      listTitle: t('dashboard.yourApplications'),
      listSubtitle: t('common.totalRecords', { count: myApps.length }),
      listAction: <Link to="/applications" style={{ fontSize: 12.5, fontWeight: 500 }}>Сите →</Link>,
      list: myApps.slice().sort(byCreatedDesc).slice(0, 5).map(a => ({
        key: a.id, to: '/applications/' + a.id,
        icon: <I.FileText size={16} />, iconTone: iconToneForStatus(a.status),
        title: a.conference,
        subtitle: a.location + ' · ' + formatDate(a.from) + ' → ' + formatDate(a.to),
        badge: <StatusBadge status={a.status} size="sm" />,
        right: formatMoney(a.requestedAmount),
      })),
      emptyHint: 'Започни со нова апликација.',
      activity: notifAct(state, user.id),
    }
  }

  if (role === 'ScientificCouncil' || role === 'DeanOffice') {
    const queue = role === 'ScientificCouncil'
      ? apps.filter(a => a.phase === 'ScientificCouncil' && ['Submitted', 'InReview'].includes(a.status))
      : apps.filter(a => a.phase === 'DeanOffice' && a.status === 'InReview')
    return {
      subtitle: t('roles.' + role),
      headerAction: queue.length > 0 ? <Link to="/approvals"><Button icon={<I.CheckCircle size={14} />}>Прегледај {queue.length}</Button></Link> : null,
      stats: [
        { label: t('dashboard.pendingApprovals'), value: queue.length, icon: <I.Clock size={16} />, tone: queue.length > 0 ? 'warning' : 'success' },
        { label: t('uc06.approvedCount'), value: apps.filter(a => a.approvals?.some(ap => ap.byId === user.id && ap.decision === 'APPROVED')).length, icon: <I.Check size={16} />, tone: 'success' },
        { label: t('uc02.queue'), value: apps.filter(a => !['Cancelled','Rejected','Completed'].includes(a.status)).length, icon: <I.Layers size={16} />, tone: 'info' },
        { label: t('uc06.completedCount'), value: apps.filter(a => a.status === 'Completed').length, icon: <I.Award size={16} />, tone: 'primary' },
      ],
      listTitle: t('uc02.queue'),
      listSubtitle: queue.length > 0 ? queue.length + ' чекаат твоја одлука' : 'сите се одобрени',
      listAction: <Link to="/approvals" style={{ fontSize: 12.5, fontWeight: 500 }}>Сите →</Link>,
      list: queue.slice(0, 5).map(a => {
        const applicant = state.users.find(u => u.id === a.applicantId)
        return {
          key: a.id, to: '/applications/' + a.id,
          icon: <I.FileText size={16} />, iconTone: 'info',
          title: a.conference,
          subtitle: (applicant?.title ? applicant.title + ' ' : '') + (applicant?.firstName + ' ' + applicant?.lastName) + ' · ' + a.location,
          badge: <StatusBadge status={a.status} size="sm" />,
          right: formatMoney(a.requestedAmount),
        }
      }),
      emptyHint: 'Нема апликации кои чекаат одлука.',
      activity: notifAct(state, user.id),
    }
  }

  if (role === 'Accounting') {
    const reportsQueue = state.expense_reports.filter(r => r.status === 'AwaitingReconciliation')
    const advances = apps.filter(a => a.status === 'Approved').length
    return {
      subtitle: t('roles.Accounting'),
      headerAction: reportsQueue.length > 0 ? <Link to="/reconciliation"><Button icon={<I.Scales size={14} />}>Порамни {reportsQueue.length}</Button></Link> : null,
      stats: [
        { label: t('dashboard.reconciliationQueue'), value: reportsQueue.length, icon: <I.Scales size={16} />, tone: reportsQueue.length > 0 ? 'warning' : 'success' },
        { label: 'Аванс да се исплати', value: advances, icon: <I.Wallet size={16} />, tone: advances > 0 ? 'info' : 'neutral' },
        { label: 'Порамнето', value: state.expense_reports.filter(r => r.status === 'Reconciled').length, icon: <I.CheckCircle size={16} />, tone: 'success' },
        { label: 'Вкупни апликации', value: apps.length, icon: <I.Layers size={16} />, tone: 'primary' },
      ],
      listTitle: 'Извештаи за порамнување',
      listSubtitle: reportsQueue.length + ' активни',
      listAction: <Link to="/reconciliation" style={{ fontSize: 12.5, fontWeight: 500 }}>Отвори →</Link>,
      list: reportsQueue.slice(0, 5).map(r => {
        const a = apps.find(x => x.id === r.applicationId)
        const u = state.users.find(u => u.id === r.applicantId)
        const diff = r.realTotal - (a?.advancePaid ?? 0)
        return {
          key: r.id, to: '/reconciliation',
          icon: <I.Receipt size={16} />, iconTone: 'warning',
          title: a?.conference,
          subtitle: u?.firstName + ' ' + u?.lastName + ' · Аванс: ' + formatMoney(a?.advancePaid ?? 0) + ' · Реални: ' + formatMoney(r.realTotal),
          badge: <Badge tone={diff > 0 ? 'warning' : diff < 0 ? 'success' : 'neutral'} size="sm">
            {diff > 0 ? '+' : ''}{formatMoney(diff)}
          </Badge>,
        }
      }),
      emptyHint: 'Нема извештаи за порамнување.',
      activity: notifAct(state, user.id),
    }
  }

  // Archive / HR / SystemAdmin
  return {
    subtitle: t('roles.' + role),
    stats: [
      { label: 'Вкупно апликации', value: apps.length, icon: <I.Layers size={16} />, tone: 'info' },
      { label: 'Завршени', value: apps.filter(a => a.status === 'Completed').length, icon: <I.CheckCircle size={16} />, tone: 'success' },
      { label: 'Активни', value: apps.filter(a => !['Cancelled','Rejected','Completed'].includes(a.status)).length, icon: <I.Clock size={16} />, tone: 'warning' },
      { label: 'Audit записи', value: state.audit_log.length, icon: <I.Shield size={16} />, tone: 'primary' },
    ],
    listTitle: 'Последни поднесувања',
    listSubtitle: t('common.totalRecords', { count: apps.length }),
    listAction: <Link to="/applications" style={{ fontSize: 12.5, fontWeight: 500 }}>Сите →</Link>,
    list: apps.slice().sort(byCreatedDesc).slice(0, 5).map(a => {
      const u = state.users.find(u => u.id === a.applicantId)
      return {
        key: a.id, to: '/applications/' + a.id,
        icon: <I.FileText size={16} />, iconTone: iconToneForStatus(a.status),
        title: a.conference,
        subtitle: u?.firstName + ' ' + u?.lastName + ' · ' + a.location,
        badge: <StatusBadge status={a.status} size="sm" />,
        right: formatMoney(a.requestedAmount),
      }
    }),
    activity: notifAct(state, user.id),
  }
}

function iconToneForStatus(s) {
  if (['Approved','Completed'].includes(s)) return 'success'
  if (['Returned','AwaitingReconciliation'].includes(s)) return 'warning'
  if (['Rejected'].includes(s)) return 'danger'
  if (['AdvancePaid'].includes(s)) return 'accent'
  if (['InReview','Submitted'].includes(s)) return 'info'
  return 'neutral'
}

function notifAct(state, userId) {
  return state.notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(n => ({ id: n.id, text: n.title + ' — ' + n.body, at: n.at }))
}

function byCreatedDesc(a, b) {
  return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')
}

function pct(value, of) {
  if (!of) return '0%'
  return Math.round((value / of) * 100) + '%'
}
