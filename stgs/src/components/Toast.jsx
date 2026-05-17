import { createContext, useCallback, useContext, useState } from 'react'
import { Check, AlertCircle, X, Info } from './icons.jsx'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const show = useCallback((message, kind = 'info', ttl = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setItems(arr => [...arr, { id, message, kind }])
    setTimeout(() => setItems(arr => arr.filter(t => t.id !== id)), ttl)
  }, [])

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div style={styles.host}>
        {items.map(t => (
          <div key={t.id} style={{ ...styles.toast, ...kindStyle(t.kind) }}>
            <div style={{ display: 'inline-flex', flexShrink: 0 }}>{iconFor(t.kind)}</div>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) return { show: () => {} }
  return ctx
}

function iconFor(kind) {
  const props = { size: 16 }
  switch (kind) {
    case 'success': return <Check {...props} />
    case 'warning': return <AlertCircle {...props} />
    case 'danger':  return <X {...props} />
    default:        return <Info {...props} />
  }
}

function kindStyle(kind) {
  switch (kind) {
    case 'success': return { borderColor: 'var(--emerald-100)', background: 'var(--surface)', color: 'var(--emerald-700)' }
    case 'warning': return { borderColor: 'var(--amber-100)', background: 'var(--surface)', color: 'var(--amber-700)' }
    case 'danger':  return { borderColor: 'var(--red-100)', background: 'var(--surface)', color: 'var(--red-700)' }
    default:        return { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-soft)' }
  }
}

const styles = {
  host: {
    position: 'fixed', bottom: 24, right: 24,
    display: 'flex', flexDirection: 'column', gap: 10,
    zIndex: 1000, pointerEvents: 'none',
  },
  toast: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    boxShadow: 'var(--shadow-lg)',
    minWidth: 280, maxWidth: 420,
    fontSize: 13, fontWeight: 500,
    pointerEvents: 'auto',
    fontFamily: 'var(--font-sans)',
    display: 'flex', alignItems: 'center', gap: 10,
    animation: 'fadeUp 0.24s cubic-bezier(0.22, 0.61, 0.36, 1) both',
  },
}
