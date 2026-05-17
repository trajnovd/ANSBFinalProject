import { useTranslation } from 'react-i18next'
import { useAuth, hasRole } from '../lib/auth.jsx'
import { Card } from './ui.jsx'

export default function RoleGuard({ roles, children }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!user) return null
  if (roles && !hasRole(user, ...roles)) {
    return (
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)' }}>🔒</h2>
          <h2 style={{ fontFamily: 'var(--font-serif)' }}>403</h2>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
            {t('roles.' + user.role)} нема дозвола за оваа страница. RBAC заштита (FR-003 / NFR-001 / MUC-01).
          </p>
        </div>
      </Card>
    )
  }
  return children
}
