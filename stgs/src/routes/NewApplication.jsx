import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { createApplication, getState } from '../lib/store.js'
import { daysBetween, formatDate, formatMoney, rangesOverlap } from '../lib/format.js'
import { Badge, Button, Card, Field, Input, PageHeader, Select, toRoman } from '../components/ui.jsx'
import { useToast } from '../components/Toast.jsx'

const STEPS = [
  { title: 'Конференција', sub: 'основни податоци за настанот' },
  { title: 'Период и буџет', sub: 'датуми и побаран износ' },
  { title: 'Документи', sub: 'покана, апстракт, предлог-буџет' },
  { title: 'Преглед', sub: 'верификација пред поднесување' },
]

export default function NewApplication() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const state = getState()
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    conference: '',
    conferenceUrl: '',
    location: '',
    from: '',
    to: '',
    requestedAmount: '',
    documents: [],
    joinSiblingGroupOf: null,
  })

  const used = useMemo(() => {
    return state.applications
      .filter(a => a.applicantId === user.id && ['Approved','AdvancePaid','AwaitingReconciliation','Completed'].includes(a.status))
      .reduce((sum, a) => sum + a.requestedAmount, 0)
  }, [state, user.id])
  const remaining = user.annualLimit - used

  // FR-020: overlap detection
  const overlapping = useMemo(() => {
    if (!form.from || !form.to) return []
    return state.applications.filter(a =>
      a.applicantId === user.id &&
      !['Cancelled', 'Rejected'].includes(a.status) &&
      rangesOverlap(a.from, a.to, form.from, form.to)
    )
  }, [state, user.id, form.from, form.to])

  // <7 days "close dates" warning
  const closeDates = useMemo(() => {
    if (!form.from || !form.to) return false
    return state.applications.some(a => {
      if (a.applicantId !== user.id || ['Cancelled', 'Rejected'].includes(a.status)) return false
      const af = new Date(a.from).getTime(); const at = new Date(a.to).getTime()
      const nf = new Date(form.from).getTime(); const nt = new Date(form.to).getTime()
      // gap < 7 days between either end
      return Math.abs(af - nt) < 7 * 86400000 || Math.abs(nf - at) < 7 * 86400000
    })
  }, [state, user.id, form.from, form.to])

  // FR-021: sibling group detection — someone else applied for the same conference
  const siblings = useMemo(() => {
    if (!form.conference || form.conference.length < 4) return []
    const q = form.conference.toLowerCase()
    return state.applications.filter(a =>
      a.applicantId !== user.id &&
      a.conference.toLowerCase().includes(q.slice(0, 12)) &&
      !['Cancelled', 'Rejected'].includes(a.status)
    )
  }, [state, user.id, form.conference])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addDoc(type) {
    const fileName = prompt('Назив на фајл (демо):', type === 'INVITATION' ? 'invitation.pdf' : type === 'ABSTRACT' ? 'abstract.pdf' : type === 'BUDGET' ? 'budget.pdf' : 'document.pdf')
    if (!fileName) return
    setForm(f => ({ ...f, documents: [...f.documents, { id: 'd_' + Math.random().toString(36).slice(2, 8), type, fileName, isShared: !!f.joinSiblingGroupOf }] }))
  }

  function removeDoc(id) {
    setForm(f => ({ ...f, documents: f.documents.filter(d => d.id !== id) }))
  }

  function validateStep() {
    if (step === 0) {
      if (!form.conference.trim() || !form.location.trim()) {
        toast.show(t('uc01.validationIncomplete'), 'danger'); return false
      }
    }
    if (step === 1) {
      if (!form.from || !form.to || new Date(form.from) > new Date(form.to) || new Date(form.from) < new Date(new Date().toISOString().slice(0, 10))) {
        toast.show(t('uc01.datesValidation'), 'danger'); return false
      }
      const amt = Number(form.requestedAmount)
      if (!amt || amt <= 0 || amt > remaining) {
        toast.show(t('uc01.amountValidation', { limit: formatMoney(remaining, { currency: 'МКД' }) }), 'danger'); return false
      }
    }
    if (step === 2) {
      const requiredTypes = ['INVITATION', 'ABSTRACT', 'BUDGET']
      const present = new Set(form.documents.map(d => d.type))
      const missing = requiredTypes.filter(rt => !present.has(rt))
      if (missing.length > 0) {
        toast.show('Недостасуваат документи: ' + missing.map(m => t('docType.' + m)).join(', '), 'danger'); return false
      }
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    setStep(s => Math.min(STEPS.length - 1, s + 1))
  }
  function back() { setStep(s => Math.max(0, s - 1)) }

  function saveDraft() {
    createApplication({
      applicantId: user.id, ...form, requestedAmount: Number(form.requestedAmount || 0),
      status: 'Draft',
    })
    toast.show(t('uc01.draftSaved'), 'success')
    nav('/applications')
  }

  function submitFinal() {
    if (!validateStep()) return
    const id = createApplication({
      applicantId: user.id, ...form, requestedAmount: Number(form.requestedAmount),
      siblingGroupId: form.joinSiblingGroupOf,
      status: 'Submitted',
    })
    toast.show(t('uc01.submittedToast'), 'success')
    nav('/applications/' + id)
  }

  return (
    <>
      <PageHeader eyebrow="UC-01 · Поднесување апликација" title={t('uc01.title')} subtitle={t('uc01.subtitle')}>
        <Link to="/applications"><Button variant="ghost">← {t('common.back')}</Button></Link>
      </PageHeader>

      <Stepper step={step} />

      <Card>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={t('uc01.conferenceName')} required>
              <Input value={form.conference} onChange={e => setField('conference', e.target.value)} placeholder="на пр. AAAI 2026 — Conference on Artificial Intelligence" />
            </Field>
            <Field label={t('uc01.conferenceUrl')}>
              <Input value={form.conferenceUrl} onChange={e => setField('conferenceUrl', e.target.value)} placeholder="https://…" />
            </Field>
            <Field label={t('uc01.location')} required>
              <Input value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Град, Држава" />
            </Field>

            {siblings.length > 0 && !form.joinSiblingGroupOf && (
              <Card style={{ background: 'var(--color-accent-soft)', border: '1px solid rgba(183,134,40,0.3)' }} title={'⤴ ' + t('uc01.siblingTitle')}>
                <p style={{ marginBottom: 10 }}>{t('uc01.siblingDescription')}</p>
                <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
                  {siblings.map(s => {
                    const u = state.users.find(u => u.id === s.applicantId)
                    return <li key={s.id} style={{ fontSize: 13 }}>{s.conference} — {u?.firstName + ' ' + u?.lastName}</li>
                  })}
                </ul>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => setField('joinSiblingGroupOf', siblings[0].id)}>{t('uc01.siblingJoin')}</Button>
                  <Button variant="ghost" onClick={() => setField('joinSiblingGroupOf', '__skipped__')}>{t('uc01.siblingSkip')}</Button>
                </div>
              </Card>
            )}
            {form.joinSiblingGroupOf && form.joinSiblingGroupOf !== '__skipped__' && (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>✓ Се приклучуваш на сиблинг-група (FR-021). Заедничките документи ќе бидат означени со <Badge tone="accent">Заеднички</Badge>.</div>
            )}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="two-col" style={{ gap: 14 }}>
              <Field label={t('common.from')} required>
                <Input type="date" value={form.from} onChange={e => setField('from', e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label={t('common.to')} required>
                <Input type="date" value={form.to} onChange={e => setField('to', e.target.value)} min={form.from || new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            {form.from && form.to && <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Времетраење: {daysBetween(form.from, form.to)} ден(а)</div>}

            {overlapping.length > 0 && (
              <Card style={{ background: 'var(--color-danger-soft)', border: '1px solid rgba(185,28,28,0.25)' }} title={'⚠ ' + t('uc01.overlapTitle')}>
                <p style={{ marginBottom: 10 }}>{t('uc01.overlapDescription')}</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {overlapping.map(o => (
                    <li key={o.id} style={{ fontSize: 13 }}>{t('uc01.overlapConflict', { title: o.conference, from: formatDate(o.from), to: formatDate(o.to) })}</li>
                  ))}
                </ul>
              </Card>
            )}

            {!overlapping.length && closeDates && (
              <div style={{ background: 'var(--color-warning-soft)', border: '1px solid rgba(180,83,9,0.25)', padding: 12, borderRadius: 6, fontSize: 13 }}>
                ⓘ {t('uc01.closeDatesWarning')}
              </div>
            )}

            <Field label={t('uc01.requestedAmount')} required
              hint={t('uc01.annualLimit') + ': ' + formatMoney(user.annualLimit) + ' · ' + t('uc01.alreadyUsed') + ': ' + formatMoney(used) + ' · ' + t('common.remaining' /* not in i18n; harmless fallback */, 'Преостанато: ') + formatMoney(remaining)}>
              <Input type="number" min="0" max={remaining} value={form.requestedAmount} onChange={e => setField('requestedAmount', e.target.value)} placeholder="0" />
            </Field>
            {Number(form.requestedAmount) > remaining && (
              <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{t('uc01.amountOverLimit', { limit: formatMoney(remaining) })}</div>
            )}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: 'var(--color-text-muted)' }}>{t('uc01.uploadHint')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['INVITATION','ABSTRACT','BUDGET','RECEIPT','OTHER'].map(typ => (
                <Button key={typ} size="sm" variant="secondary" onClick={() => addDoc(typ)}>+ {t('docType.' + typ)}</Button>
              ))}
            </div>
            {form.documents.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)' }}>{t('uc01.noDocs')}</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {form.documents.map(d => (
                  <li key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <strong>{d.fileName}</strong> <Badge tone="primary">{t('docType.' + d.type)}</Badge>
                      {d.isShared && <Badge tone="accent" style={{ marginLeft: 6 }}>Заеднички</Badge>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeDoc(d.id)}>{t('common.remove')}</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3>{t('common.summary')}</h3>
            <div className="two-col" style={{ gap: 14 }}>
              <Summary label={t('uc01.conferenceName')} value={form.conference} />
              <Summary label={t('uc01.location')} value={form.location} />
              <Summary label={t('common.from')} value={formatDate(form.from)} />
              <Summary label={t('common.to')} value={formatDate(form.to)} />
              <Summary label={t('uc01.requestedAmount')} value={formatMoney(form.requestedAmount)} />
              <Summary label="Документи" value={form.documents.length + ' прикачени'} />
              {form.joinSiblingGroupOf && form.joinSiblingGroupOf !== '__skipped__' && <Summary label="Сиблинг-група" value="Да (FR-021)" />}
              {overlapping.length > 0 && <Summary label="⚠ Преклоп" value={'Откриен (' + overlapping.length + ')'} />}
            </div>
            <p style={{ color: 'var(--color-text-muted)' }}>{t('uc01.submitConfirmBody')}</p>
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 18 }}>
        <Button variant="ghost" onClick={saveDraft}>{t('common.saveDraft')}</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={back}>{t('common.previous')}</Button>}
          {step < STEPS.length - 1 && <Button onClick={next}>{t('common.next')} →</Button>}
          {step === STEPS.length - 1 && <Button variant="success" onClick={submitFinal}>✓ {t('common.submit')}</Button>}
        </div>
      </div>
    </>
  )
}

function Stepper({ step }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
      gap: 0,
      marginBottom: 26,
      borderTop: '1.5px solid var(--rule-strong)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {STEPS.map((s, i) => {
        const active = i === step
        const done = i < step
        return (
          <div key={i} style={{
            padding: '14px 18px',
            borderRight: i < STEPS.length - 1 ? '1px solid var(--color-border)' : 'none',
            background: active ? 'var(--paper-soft)' : 'transparent',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span className="roman" style={{
                fontSize: 22,
                color: active ? 'var(--color-accent)' : done ? 'var(--forest)' : 'var(--rule-strong)',
              }}>{toRoman(i + 1)}.</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16, fontWeight: active ? 600 : 500,
                color: active ? 'var(--ink)' : done ? 'var(--ink-soft)' : 'var(--ink-muted)',
                letterSpacing: '-0.005em',
              }}>{s.title}</span>
              {done && <span style={{ marginLeft: 'auto', color: 'var(--forest)', fontSize: 14 }}>✓</span>}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 12, color: 'var(--ink-muted)',
            }}>{s.sub}</div>
            {active && <div style={{
              position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
              background: 'var(--color-accent)',
            }} />}
          </div>
        )
      })}
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
