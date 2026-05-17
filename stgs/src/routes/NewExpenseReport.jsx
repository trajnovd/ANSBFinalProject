import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState, submitExpenseReport } from '../lib/store.js'
import { daysBetween, formatDate, formatMoney, hoursSince } from '../lib/format.js'
import { Badge, Button, Card, Field, Input, PageHeader, Textarea } from '../components/ui.jsx'
import { useToast } from '../components/Toast.jsx'

const PER_DIEM = 3800 // MKD/day default (FR-011)

export default function NewExpenseReport() {
  const { t } = useTranslation()
  const { applicationId } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const state = getState()
  const app = state.applications.find(a => a.id === applicationId)

  const computedDays = app ? daysBetween(app.from, app.to) : 0

  const [form, setForm] = useState({
    daysAway: computedDays,
    perDiemRate: PER_DIEM,
    transport: 0, accommodation: 0, registration: 0, other: 0,
    late: app ? hoursSince(app.to + 'T00:00:00') > 48 : false,
    lateReason: '',
    receipts: [],
  })

  const perDiemTotal = useMemo(() => Math.max(0, Number(form.daysAway || 0)) * Math.max(0, Number(form.perDiemRate || 0)), [form.daysAway, form.perDiemRate])
  const realTotal = useMemo(() => perDiemTotal + Number(form.transport || 0) + Number(form.accommodation || 0) + Number(form.registration || 0) + Number(form.other || 0), [perDiemTotal, form])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function addReceipt() {
    const fileName = prompt('Назив на сметка/потврда:', 'receipt.pdf')
    if (!fileName) return
    setField('receipts', [...form.receipts, { id: 'r_' + Math.random().toString(36).slice(2, 8), fileName }])
  }
  function removeReceipt(id) { setField('receipts', form.receipts.filter(r => r.id !== id)) }

  function submit() {
    if (form.late && !form.lateReason.trim()) { toast.show('Образложи зошто извештајот е доцен.', 'danger'); return }
    submitExpenseReport({
      applicationId: app.id,
      applicantId: user.id,
      daysAway: Number(form.daysAway),
      perDiemRate: Number(form.perDiemRate),
      perDiemTotal,
      transport: Number(form.transport),
      accommodation: Number(form.accommodation),
      registration: Number(form.registration),
      other: Number(form.other),
      realTotal,
      receipts: form.receipts,
      late: form.late, lateReason: form.late ? form.lateReason : null,
    })
    toast.show(t('uc04.submittedToast'), 'success')
    nav('/reports')
  }

  if (!app) return <PageHeader title={t('common.noData')} />

  const hours = hoursSince(app.to + 'T00:00:00')

  return (
    <>
      <PageHeader title={t('uc04.title')} subtitle={app.conference + ' · ' + app.location}>
        <Link to="/reports"><Button variant="ghost">← {t('common.back')}</Button></Link>
      </PageHeader>

      {hours > 48 && (
        <div style={{ marginBottom: 18, padding: 12, background: 'var(--color-danger-soft)', border: '1px solid rgba(185,28,28,0.25)', borderRadius: 6, fontSize: 13 }}>
          ⏱ {t('uc04.lateNotice')} (поминати {hours} часа од враќањето)
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <Card title="Пресметка">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label={t('uc04.daysAway')} required>
              <Input type="number" min="1" value={form.daysAway} onChange={e => setField('daysAway', e.target.value)} />
            </Field>
            <Field label={t('uc04.perDiem')} required>
              <Input type="number" min="0" value={form.perDiemRate} onChange={e => setField('perDiemRate', e.target.value)} />
            </Field>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {t('uc04.perDiemAuto', { count: form.daysAway || 0, rate: form.perDiemRate || 0, total: formatMoney(perDiemTotal) })}
          </div>
          <hr style={{ margin: '14px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label={t('uc04.transport')}>
              <Input type="number" min="0" value={form.transport} onChange={e => setField('transport', e.target.value)} />
            </Field>
            <Field label={t('uc04.accommodation')}>
              <Input type="number" min="0" value={form.accommodation} onChange={e => setField('accommodation', e.target.value)} />
            </Field>
            <Field label={t('uc04.registrationFee')}>
              <Input type="number" min="0" value={form.registration} onChange={e => setField('registration', e.target.value)} />
            </Field>
            <Field label={t('uc04.other')}>
              <Input type="number" min="0" value={form.other} onChange={e => setField('other', e.target.value)} />
            </Field>
          </div>
          {form.late && (
            <Field label={t('uc04.lateReason')} required>
              <Textarea value={form.lateReason} onChange={e => setField('lateReason', e.target.value)} />
            </Field>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title={t('uc04.totalReal')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Дневници" value={formatMoney(perDiemTotal)} />
              <Row label="Транспорт" value={formatMoney(form.transport)} />
              <Row label="Сместување" value={formatMoney(form.accommodation)} />
              <Row label="Котизација" value={formatMoney(form.registration)} />
              <Row label="Други" value={formatMoney(form.other)} />
              <hr style={{ margin: '4px 0' }} />
              <Row label="ВКУПНО" value={formatMoney(realTotal)} bold />
              <hr style={{ margin: '4px 0' }} />
              <Row label="Исплатен аванс" value={formatMoney(app.advancePaid)} />
              <Row label="Разлика" value={formatMoney(realTotal - (app.advancePaid ?? 0))} tone={realTotal > (app.advancePaid ?? 0) ? 'warning' : 'success'} />
            </div>
          </Card>

          <Card title={t('uc04.receipts')}>
            <Button size="sm" variant="secondary" onClick={addReceipt}>+ {t('common.addFile')}</Button>
            {form.receipts.length === 0 ? <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 8 }}>Нема прикачени сметки.</div> :
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
                {form.receipts.map(r => (
                  <li key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 13 }}>📎 {r.fileName}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeReceipt(r.id)}>×</Button>
                  </li>
                ))}
              </ul>
            }
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <Link to="/reports"><Button variant="ghost">{t('common.cancel')}</Button></Link>
        <Button variant="success" onClick={submit}>✓ {t('common.submit')}</Button>
      </div>
    </>
  )
}

function Row({ label, value, bold, tone }) {
  const color = tone === 'warning' ? 'var(--color-warning)' : tone === 'success' ? 'var(--color-success)' : 'var(--color-text)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="mono" style={{ color }}>{value}</span>
    </div>
  )
}
