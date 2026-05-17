import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { cancelAndLinkApplication, getState } from '../lib/store.js'
import { Button, Card, Field, Input, PageHeader, Textarea } from '../components/ui.jsx'
import { formatDate, formatMoney } from '../lib/format.js'
import { useToast } from '../components/Toast.jsx'

export default function CancelApplication() {
  const { t } = useTranslation()
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const state = getState()
  const old = state.applications.find(a => a.id === id)
  const [reason, setReason] = useState('')
  const [form, setForm] = useState({
    conference: old?.conference + ' (заменска)' ?? '',
    location: old?.location ?? '',
    from: '', to: '',
    requestedAmount: old?.requestedAmount ?? 0,
  })

  if (!old) return <PageHeader title={t('common.noData')} />

  const blocked = !!old.advancePaid

  function submit() {
    if (!reason.trim()) { toast.show(t('uc03.reason'), 'danger'); return }
    if (!form.conference || !form.location || !form.from || !form.to) {
      toast.show(t('uc01.validationIncomplete'), 'danger'); return
    }
    const newId = cancelAndLinkApplication({ oldId: old.id, byUserId: user.id, reason, newData: form })
    toast.show(t('uc03.linkedSuccess'), 'success')
    nav('/applications/' + newId)
  }

  return (
    <>
      <PageHeader title={t('uc03.title')} subtitle={t('uc03.subtitle')}>
        <Link to={'/applications/' + old.id}><Button variant="ghost">← {t('common.back')}</Button></Link>
      </PageHeader>

      {blocked && (
        <div style={{ marginBottom: 18, padding: 14, background: 'var(--color-danger-soft)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: 6 }}>
          <strong>🔒 {t('uc03.blockedAdvance')}</strong>
          <p style={{ marginTop: 6, color: 'var(--color-text-muted)' }}>Авансот: {formatMoney(old.advancePaid)} — мора рачно да се одобри враќањето од Сметководство пред да можеш да го линкуваш новиот запис.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card title="Постоечка апликација (за поништување)" subtitle={old.conference}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Item label="Локација" value={old.location} />
            <Item label="Период" value={formatDate(old.from) + ' → ' + formatDate(old.to)} />
            <Item label="Износ" value={formatMoney(old.requestedAmount)} />
            <Item label="Статус" value={old.status} />
            <Field label={t('uc03.reason')} required>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Кратко објаснување за поништувањето" />
            </Field>
          </div>
        </Card>

        <Card title="Нова апликација (заменска)" subtitle="Ќе наследи историја преку линкување (FR-019).">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label={t('uc01.conferenceName')} required>
              <Input value={form.conference} onChange={e => setForm(f => ({ ...f, conference: e.target.value }))} />
            </Field>
            <Field label={t('uc01.location')} required>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={t('common.from')} required>
                <Input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} />
              </Field>
              <Field label={t('common.to')} required>
                <Input type="date" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} />
              </Field>
            </div>
            <Field label={t('uc01.requestedAmount')} required>
              <Input type="number" min="0" value={form.requestedAmount} onChange={e => setForm(f => ({ ...f, requestedAmount: Number(e.target.value) }))} />
            </Field>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <Link to={'/applications/' + old.id}><Button variant="ghost">{t('common.cancel')}</Button></Link>
        <Button variant="danger" onClick={submit} disabled={blocked}>{t('uc03.submit')}</Button>
      </div>
    </>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 14 }}>{value}</div>
    </div>
  )
}
