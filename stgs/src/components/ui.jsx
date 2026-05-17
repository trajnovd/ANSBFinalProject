import { useEffect } from 'react'

/* ─── Button ─────────────────────────────────────────────────────────────── */
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, disabled, type = 'button', ...rest }) {
  const v = variantStyle(variant)
  const s = sizeStyle(size)
  return (
    <button type={type} disabled={disabled} {...rest}
      style={{ ...baseBtn, ...v, ...s, ...(disabled ? disabledBtn : null), ...(rest.style ?? {}) }}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 7 }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 7 }}>{iconRight}</span>}
    </button>
  )
}

function variantStyle(v) {
  switch (v) {
    case 'primary':   return { background: 'var(--primary)', color: 'var(--primary-fg)', border: '1px solid var(--primary)' }
    case 'secondary': return { background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }
    case 'danger':    return { background: 'var(--danger)', color: '#fff', border: '1px solid var(--danger)' }
    case 'ghost':     return { background: 'transparent', color: 'var(--fg-muted)', border: '1px solid transparent' }
    case 'success':   return { background: 'var(--success)', color: '#fff', border: '1px solid var(--success)' }
    case 'warning':   return { background: 'var(--warning)', color: '#fff', border: '1px solid var(--warning)' }
    case 'accent':    return { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
    case 'link':      return { background: 'transparent', color: 'var(--accent)', border: 'none', padding: 0 }
    default: return { background: 'var(--primary)', color: 'var(--primary-fg)', border: '1px solid var(--primary)' }
  }
}
function sizeStyle(s) {
  switch (s) {
    case 'sm': return { padding: '5px 11px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', height: 28 }
    case 'lg': return { padding: '10px 18px', fontSize: 14, borderRadius: 'var(--radius-md)', height: 40 }
    default:   return { padding: '7px 14px', fontSize: 13, borderRadius: 'var(--radius-sm)', height: 34 }
  }
}
const baseBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontWeight: 500, whiteSpace: 'nowrap', userSelect: 'none',
  letterSpacing: '-0.005em',
  transition: 'background 0.12s, color 0.12s, border-color 0.12s, box-shadow 0.12s, transform 0.06s',
  boxShadow: 'var(--shadow-xs)',
}
const disabledBtn = { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' }

/* ─── Card ───────────────────────────────────────────────────────────────── */
export function Card({ title, subtitle, action, eyebrow, children, padding = 18, style, noBorder }) {
  return (
    <section style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      border: noBorder ? 'none' : '1px solid var(--border)',
      boxShadow: 'var(--shadow-xs)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action || eyebrow) && (
        <header style={{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '14px 18px',
          gap: 14,
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
            {title && <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{title}</h3>}
            {subtitle && <div style={{ marginTop: 3, color: 'var(--fg-muted)', fontSize: 12.5 }}>{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  )
}

/* ─── Form fields ────────────────────────────────────────────────────────── */
const fieldBase = {
  width: '100%', padding: '8px 12px', fontSize: 13.5,
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-sans)',
  color: 'var(--fg)',
  transition: 'border-color 0.12s, box-shadow 0.12s, background 0.12s',
  height: 36,
  lineHeight: 1.4,
}

export function Field({ label, hint, error, required, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </span>}
      {children}
      {hint && !error && <small style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>{hint}</small>}
      {error && <small style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</small>}
    </label>
  )
}

export function Input(props) {
  return <input {...props} style={{ ...fieldBase, ...(props.style ?? {}) }}
    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)' }}
    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = '' }}
  />
}
export function Textarea(props) {
  return <textarea {...props} style={{ ...fieldBase, height: 'auto', minHeight: 88, resize: 'vertical', padding: '10px 12px', ...(props.style ?? {}) }}
    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)' }}
    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = '' }}
  />
}
export function Select({ children, ...rest }) {
  return <select {...rest} style={{
    ...fieldBase, appearance: 'none', paddingRight: 36,
    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'><path d='M1 1L6 6L11 1' stroke='%2378716c' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px 8px',
    ...(rest.style ?? {}),
  }}>{children}</select>
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
export function Badge({ children, tone = 'neutral', size = 'md', dot, style }) {
  const t = badgeTone(tone)
  const pad = size === 'sm' ? '1px 7px' : '2px 9px'
  const fs = size === 'sm' ? 10.5 : 11.5
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: pad,
      borderRadius: 999,
      fontSize: fs,
      fontWeight: 500,
      lineHeight: 1.5,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      whiteSpace: 'nowrap',
      letterSpacing: '-0.005em',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot ?? t.fg }} />}
      {children}
    </span>
  )
}
function badgeTone(tone) {
  switch (tone) {
    case 'success': return { bg: 'var(--emerald-50)', fg: 'var(--emerald-700)', border: 'var(--emerald-100)', dot: 'var(--emerald-500)' }
    case 'warning': return { bg: 'var(--amber-50)', fg: 'var(--amber-700)', border: 'var(--amber-100)', dot: 'var(--amber-500)' }
    case 'danger':  return { bg: 'var(--red-50)', fg: 'var(--red-700)', border: 'var(--red-100)', dot: 'var(--red-500)' }
    case 'info':    return { bg: 'var(--blue-50)', fg: 'var(--blue-700)', border: 'var(--blue-100)', dot: 'var(--blue-500)' }
    case 'primary': return { bg: 'var(--slate-100)', fg: 'var(--slate-700)', border: 'var(--slate-200)', dot: 'var(--slate-500)' }
    case 'accent':  return { bg: 'var(--violet-50)', fg: 'var(--violet-600)', border: 'var(--violet-100)', dot: 'var(--violet-500)' }
    default:        return { bg: 'var(--stone-100)', fg: 'var(--stone-700)', border: 'var(--stone-200)', dot: 'var(--stone-500)' }
  }
}

/* ─── IconBox — tinted square holding an icon ────────────────────────────── */
export function IconBox({ icon, tone = 'neutral', size = 36 }) {
  const t = badgeTone(tone)
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-md)',
      background: t.bg, color: t.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      border: `1px solid ${t.border}`,
    }}>
      {icon}
    </div>
  )
}

/* ─── Stat card with icon + trend ────────────────────────────────────────── */
export function Stat({ label, value, hint, tone = 'neutral', icon, trend, change }) {
  return (
    <div style={{
      padding: 18,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {icon && <IconBox icon={icon} tone={tone} size={32} />}
        {trend && <Badge tone={trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'neutral'} size="sm">
          {trend === 'up' && '↑'} {trend === 'down' && '↓'} {change}
        </Badge>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 600,
        color: 'var(--fg)',
        letterSpacing: '-0.025em',
        lineHeight: 1.15,
        fontFeatureSettings: "'tnum' 1",
      }}>{value}</div>
      {hint && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg-subtle)' }}>{hint}</div>}
    </div>
  )
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, width = 540 }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 200,
      backdropFilter: 'blur(4px)',
      animation: 'fadeUp 0.18s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.24s cubic-bezier(0.22, 0.61, 0.36, 1) both',
      }}>
        {title && <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
        </div>}
        <div style={{ padding: 22, flex: 1 }}>{children}</div>
        {footer && <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          background: 'var(--surface-soft)',
        }}>{footer}</div>}
      </div>
    </div>
  )
}

/* ─── Empty / DataTable ──────────────────────────────────────────────────── */
export function EmptyState({ icon, title, hint, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '48px 24px', gap: 8,
      color: 'var(--fg-muted)',
    }}>
      {icon && <div style={{
        marginBottom: 6,
        width: 44, height: 44,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-subtle)',
      }}>{icon}</div>}
      {title && <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{title}</div>}
      {hint && <div style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 360 }}>{hint}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

export function DataTable({ columns, rows, onRowClick, empty }) {
  if (!rows || rows.length === 0) return empty ?? <EmptyState title="—" />
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className="eyebrow" style={{
                textAlign: 'left',
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--fg-muted)',
                whiteSpace: 'nowrap',
                fontSize: 11,
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                onMouseLeave={e => { if (onRowClick) e.currentTarget.style.background = '' }}>
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-soft)',
                  verticalAlign: 'top',
                }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PageHeader({ title, subtitle, eyebrow, children }) {
  return (
    <div style={{
      marginBottom: 24,
      display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26, fontWeight: 600,
          letterSpacing: '-0.022em',
          lineHeight: 1.18,
        }}>{title}</h1>
        {subtitle && <div style={{
          marginTop: 6,
          fontSize: 14,
          color: 'var(--fg-muted)',
          maxWidth: 720,
        }}>{subtitle}</div>}
      </div>
      {children && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>}
    </div>
  )
}

/* ─── Section divider ────────────────────────────────────────────────────── */
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
      marginBottom: 14, marginTop: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

// Roman numerals helper retained for places that still use it.
export function toRoman(num) {
  const map = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]]
  let r = ''
  for (const [s, v] of map) {
    while (num >= v) { r += s; num -= v }
  }
  return r
}
