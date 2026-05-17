import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth.jsx'
import { getState, subscribe, transferAnnualLimit } from '../lib/store.js'
import { formatMoney } from '../lib/format.js'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Stat } from '../components/ui.jsx'
import * as I from '../components/icons.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Budget() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const [s, setS] = useState(getState())
  useEffect(() => subscribe(setS), [])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [transferOpen, setTransferOpen] = useState(false)
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '' })

  const budget = s.budgets.find(b => String(b.year) === year)
  const totals = useMemo(() => computeTotals(s, Number(year)), [s, year])

  function exportCsv() {
    const rows = [
      ['UID', 'Конференција', 'Апликант', 'Период', 'Износ', 'Статус'],
      ...s.applications.map(a => {
        const u = s.users.find(u => u.id === a.applicantId)
        return [a.id, a.conference, u ? u.firstName + ' ' + u.lastName : '', a.from + '–' + a.to, a.requestedAmount, a.status]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'STGS_buxet_' + year + '.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  function exportPdf() {
    window.print()
  }

  function executeTransfer() {
    const amt = Number(transfer.amount)
    if (!transfer.from || !transfer.to || transfer.from === transfer.to || !amt || amt <= 0) {
      toast.show('Невалидни податоци за пренос.', 'danger'); return
    }
    transferAnnualLimit({ fromUserId: transfer.from, toUserId: transfer.to, amount: amt, approverId: user.id })
    toast.show(t('uc06.transferToast'), 'success')
    setTransferOpen(false); setTransfer({ from: '', to: '', amount: '' })
  }

  const isApprover = ['DeanOffice'].includes(user.role)

  return (
    <>
      <PageHeader eyebrow="UC-06 · Буџет и извештаи" title={t('uc06.title')} subtitle={t('uc06.subtitle')}>
        <Button variant="secondary" icon={<I.Download size={14} />} onClick={exportCsv}>{t('common.exportExcel')}</Button>
        <Button variant="secondary" icon={<I.Download size={14} />} onClick={exportPdf}>{t('common.exportPdf')}</Button>
        {isApprover && <Button icon={<I.ArrowUpRight size={14} />} onClick={() => setTransferOpen(true)}>Пренос на лимит</Button>}
      </PageHeader>

      <Card title={t('uc06.filters')}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
          <Field label={t('uc06.year')}>
            <Select value={year} onChange={e => setYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
          </Field>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>{t('uc06.exportNote')}</div>
        </div>
      </Card>

      <div style={{ height: 18 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <Stat icon={<I.Wallet size={16} />} tone="primary" label={t('uc06.totalBudget')} value={formatMoney(budget?.total ?? 0)} />
        <Stat icon={<I.TrendingUp size={16} />} tone={totals.spent > (budget?.total ?? 0) * 0.8 ? 'warning' : 'info'} label={t('uc06.spent')} value={formatMoney(totals.spent)} hint={pct(totals.spent, budget?.total) + ' од буџетот'} />
        <Stat icon={<I.Clock size={16} />} tone="accent" label={t('uc06.committed')} value={formatMoney(totals.committed)} hint={pct(totals.committed, budget?.total) + ' резервирано'} />
        <Stat icon={<I.CheckCircle size={16} />} tone="success" label={t('uc06.remaining')} value={formatMoney((budget?.total ?? 0) - totals.spent - totals.committed)} hint="достапно" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <Stat icon={<I.FileText size={16} />} tone="info" label={t('uc06.applicationsCount')} value={totals.submitted} />
        <Stat icon={<I.Check size={16} />} tone="success" label={t('uc06.approvedCount')} value={totals.approved} />
        <Stat icon={<I.X size={16} />} tone="danger" label={t('uc06.rejectedCount')} value={totals.rejected} />
        <Stat icon={<I.Award size={16} />} tone="accent" label={t('uc06.completedCount')} value={totals.completed} />
      </div>

      <Card title="Распределба по вработени">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {totals.byUser.map(row => (
            <div key={row.userId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 200, fontWeight: 500, fontSize: 13 }}>{row.name}</div>
              <div style={{ flex: 1, height: 10, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden', display: 'flex', border: '1px solid var(--border-soft)' }}>
                <div style={{ width: pct(row.spent, row.limit), background: 'var(--accent)', transition: 'width 0.3s' }} />
                <div style={{ width: pct(row.committed, row.limit), background: 'var(--blue-500)', opacity: 0.4, transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: 240, textAlign: 'right', fontSize: 12 }} className="mono">
                {formatMoney(row.spent)} / {formatMoney(row.limit)}
              </div>
              {row.spent + row.committed > row.limit * 0.9 && <Badge tone="warning">90%+</Badge>}
            </div>
          ))}
        </div>
      </Card>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)}
        title={t('uc06.transferTitle')} footer={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={executeTransfer}>Изврши пренос</Button>
          </>
        }>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>{t('uc06.transferDescription')}</p>
        <Field label={t('uc06.transferFrom')} required>
          <Select value={transfer.from} onChange={e => setTransfer(tr => ({ ...tr, from: e.target.value }))}>
            <option value="">— Избери —</option>
            {s.users.filter(u => u.role === 'Applicant').map(u => <option key={u.id} value={u.id}>{u.firstName + ' ' + u.lastName} · лимит: {formatMoney(u.annualLimit)}</option>)}
          </Select>
        </Field>
        <div style={{ height: 10 }} />
        <Field label={t('uc06.transferTo')} required>
          <Select value={transfer.to} onChange={e => setTransfer(tr => ({ ...tr, to: e.target.value }))}>
            <option value="">— Избери —</option>
            {s.users.filter(u => u.role === 'Applicant').map(u => <option key={u.id} value={u.id}>{u.firstName + ' ' + u.lastName} · лимит: {formatMoney(u.annualLimit)}</option>)}
          </Select>
        </Field>
        <div style={{ height: 10 }} />
        <Field label={t('uc06.transferAmount')} required>
          <Input type="number" min="0" value={transfer.amount} onChange={e => setTransfer(tr => ({ ...tr, amount: e.target.value }))} />
        </Field>
      </Modal>
    </>
  )
}

function pct(value, of) {
  if (!of || of === 0) return '0%'
  return Math.round((value / of) * 100) + '%'
}

function computeTotals(state, year) {
  const apps = state.applications
  const spent = apps.filter(a => ['Completed','AwaitingReconciliation'].includes(a.status))
    .reduce((acc, a) => {
      const er = state.expense_reports.find(r => r.applicationId === a.id)
      return acc + (er?.realTotal ?? a.requestedAmount)
    }, 0)
  const committed = apps.filter(a => ['Approved','AdvancePaid'].includes(a.status))
    .reduce((acc, a) => acc + a.requestedAmount, 0)
  const submitted = apps.length
  const approved = apps.filter(a => ['Approved','AdvancePaid','AwaitingReconciliation','Completed'].includes(a.status)).length
  const rejected = apps.filter(a => a.status === 'Rejected').length
  const completed = apps.filter(a => a.status === 'Completed').length

  const applicants = state.users.filter(u => u.role === 'Applicant')
  const byUser = applicants.map(u => {
    const my = apps.filter(a => a.applicantId === u.id)
    const userSpent = my.filter(a => ['Completed','AwaitingReconciliation'].includes(a.status)).reduce((acc, a) => acc + a.requestedAmount, 0)
    const userCommitted = my.filter(a => ['Approved','AdvancePaid'].includes(a.status)).reduce((acc, a) => acc + a.requestedAmount, 0)
    return { userId: u.id, name: u.firstName + ' ' + u.lastName, limit: u.annualLimit, spent: userSpent, committed: userCommitted }
  }).sort((a, b) => b.spent - a.spent)

  return { spent, committed, submitted, approved, rejected, completed, byUser }
}
