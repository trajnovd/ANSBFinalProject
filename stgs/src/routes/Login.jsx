import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getState } from '../lib/store.js'
import { Button, Field, Input, Badge } from '../components/ui.jsx'
import LangSwitch from '../components/LangSwitch.jsx'
import * as I from '../components/icons.jsx'

export default function Login() {
  const { t } = useTranslation()
  const { loginAs } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('aleksandar.kostadinov@finki.ukim.mk')
  const [password, setPassword] = useState('demo')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [pendingUserId, setPendingUserId] = useState(null)
  const state = getState()

  function handleCreds(e) {
    e.preventDefault(); setError('')
    const u = state.users.find(x => x.email.toLowerCase() === email.toLowerCase())
    if (!u || !password) { setError(t('auth.invalidCreds')); return }
    setPendingUserId(u.id); setStep('2fa')
  }
  function handleOtp(e) {
    e.preventDefault(); setError('')
    if (!/^\d{6}$/.test(otp)) { setError(t('auth.invalidCreds')); return }
    loginAs(pendingUserId); nav('/')
  }
  function ssoLogin() {
    const visiting = state.users.find(u => u.applicantType === 'UKIM_Visiting')
    if (visiting) { loginAs(visiting.id); nav('/') }
  }
  function quickLoginAs(userId) { loginAs(userId); nav('/') }

  const demoUsers = [
    { id: 'u_aleksandar', name: 'Александар Костадинов', role: 'Applicant', sub: 'проф. д-р · ФИНКИ' },
    { id: 'u_marija',     name: 'Марија Стојановска', role: 'Applicant', sub: 'доц. д-р · ФИНКИ' },
    { id: 'u_petar',      name: 'Петар Ангеловски', role: 'Applicant', sub: 'асист. м-р · ФИНКИ' },
    { id: 'u_visiting',   name: 'Елена Спировска', role: 'Applicant', sub: 'визитинг · ПМФ' },
    { id: 'u_council1',   name: 'Дарко Поповски', role: 'ScientificCouncil', sub: 'Научен совет' },
    { id: 'u_dean',       name: 'Кире Тримчев', role: 'DeanOffice', sub: 'Декан / Деканат' },
    { id: 'u_acct',       name: 'Билјана Митровска', role: 'Accounting', sub: 'Сметководство' },
    { id: 'u_arhiva',     name: 'Архива ФИНКИ', role: 'Archive', sub: 'Архива' },
    { id: 'u_admin',      name: 'Систем Администратор', role: 'SystemAdmin', sub: 'NFR-001 · ревизорска трага' },
  ]

  const features = [
    { icon: <I.FilePlus size={16} />, title: 'Електронско поднесување', body: 'Wizard со 4 чекори, sibling + overlap детекција' },
    { icon: <I.CheckCircle size={16} />, title: 'Двостепено одобрување', body: 'Научен совет → Деканат, со audit trail' },
    { icon: <I.Scales size={16} />, title: 'Автоматско порамнување', body: 'Аванс ↔ реални, со рачно одобрување (HITL)' },
    { icon: <I.Shield size={16} />, title: 'Ревизорска трага', body: 'Append-only, AES-256, RBAC, TLS 1.2+' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
    }}>
      {/* Brand / feature side */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '40px 56px',
        background: `
          radial-gradient(80% 60% at 0% 0%, rgba(37, 99, 235, 0.06) 0%, transparent 60%),
          radial-gradient(60% 60% at 100% 100%, rgba(15, 23, 42, 0.04) 0%, transparent 60%),
          linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 100%)
        `,
        borderRight: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top brand */}
        <div className="reveal reveal-1" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--slate-800), var(--slate-950))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <I.GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.015em' }}>STGS</div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Scientific Travel Grant System</div>
          </div>
        </div>

        {/* Main copy */}
        <div className="reveal reveal-2">
          <Badge tone="info" size="sm" dot style={{ marginBottom: 18 }}>
            IEEE 830-1998 · v1.1 финална
          </Badge>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 44, fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: 'var(--fg)',
            maxWidth: 520,
          }}>
            Систем за управување со грантови за научни патувања.
          </h1>
          <p style={{
            marginTop: 16,
            fontSize: 15,
            color: 'var(--fg-muted)',
            lineHeight: 1.55,
            maxWidth: 480,
          }}>
            Електронско поднесување, двостепено одобрување, автоматско порамнување аванс ↔ реални трошоци и централна архива — изграден според СРС v1.1 од тимот CodeLeap.
          </p>

          {/* Feature grid */}
          <div style={{
            marginTop: 28,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            maxWidth: 520,
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10,
                padding: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{f.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 1, lineHeight: 1.4 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="reveal reveal-3" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          fontSize: 12, color: 'var(--fg-subtle)',
        }}>
          <span style={{ fontWeight: 500, color: 'var(--fg-muted)' }}>Тим CodeLeap</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Бојан Ефтимоски</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Јаков Спировски</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Дарко Трајанов</span>
        </div>
      </div>

      {/* Form side */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 56px',
        background: 'var(--surface)',
      }}>
        <div className="reveal reveal-2" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 28,
        }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Vol. I · Најава</div>
            <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{t('auth.loginTitle')}</h2>
            <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--fg-muted)' }}>{t('auth.loginSubtitle')}</p>
          </div>
          <LangSwitch />
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCreds} className="reveal reveal-3" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
            <Field label={t('auth.emailLabel')} required>
              <div style={{ position: 'relative' }}>
                <I.Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={{ paddingLeft: 38 }} />
              </div>
            </Field>
            <Field label={t('auth.passwordLabel')} required>
              <div style={{ position: 'relative' }}>
                <I.Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingLeft: 38 }} />
              </div>
            </Field>
            {error && <div style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.AlertCircle size={14} />{error}
            </div>}
            <Button type="submit" size="lg" iconRight={<I.ArrowUpRight size={15} />} style={{ width: '100%', marginTop: 4 }}>{t('auth.submit')}</Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>или</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <Button type="button" variant="secondary" size="lg" icon={<I.KeyRound size={15} />} onClick={ssoLogin} style={{ width: '100%' }}>
              {t('auth.ssoUkim')}
            </Button>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={handleOtp} className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
            <Field label={t('auth.twoFactorPrompt')} hint={t('auth.twoFactorHint')} required>
              <Input type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                required autoFocus
                style={{
                  letterSpacing: '0.5em', textAlign: 'center', fontSize: 22,
                  fontFamily: 'var(--font-mono)', height: 52,
                }} />
            </Field>
            {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
            <Button type="submit" size="lg">{t('common.confirm')}</Button>
            <Button type="button" variant="ghost" onClick={() => setStep('credentials')}>← {t('common.back')}</Button>
          </form>
        )}

        {/* Demo accounts */}
        <div className="reveal reveal-4" style={{ marginTop: 36, maxWidth: 460 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 12,
          }}>
            <I.Sparkles size={14} style={{ color: 'var(--violet)' }} />
            <div className="eyebrow" style={{ color: 'var(--fg-muted)' }}>Demo акаунти · еднокликни најава</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {demoUsers.map(u => (
              <button key={u.id} onClick={() => quickLoginAs(u.id)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 11px',
                  textAlign: 'left',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  color: 'var(--fg-muted)',
                  fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--border)',
                }}>{u.name.split(' ')[0][0] + (u.name.split(' ')[1]?.[0] ?? '')}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
