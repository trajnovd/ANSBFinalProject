import { useTranslation } from 'react-i18next'

export default function LangSwitch() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith('en') ? 'en' : 'mk'
  return (
    <div style={{
      display: 'inline-flex',
      padding: 2,
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      {['mk', 'en'].map(code => (
        <button key={code}
          onClick={() => i18n.changeLanguage(code)}
          style={{
            padding: '4px 10px',
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: lang === code ? 'var(--surface)' : 'transparent',
            color: lang === code ? 'var(--fg)' : 'var(--fg-muted)',
            border: 'none',
            borderRadius: 4,
            boxShadow: lang === code ? 'var(--shadow-xs)' : 'none',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
            fontFamily: 'var(--font-sans)',
          }}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
