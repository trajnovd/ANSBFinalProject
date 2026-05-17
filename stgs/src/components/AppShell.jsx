import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import LangSwitch from './LangSwitch.jsx'
import BackendBadge from './BackendBadge.jsx'
import { Badge } from './ui.jsx'
import { useEffect, useState } from 'react'
import { getState, subscribe, markNotificationRead } from '../lib/store.js'
import { useIsMobile } from '../lib/useMediaQuery.js'
import * as I from './icons.jsx'

export default function AppShell({ children }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const isMobile = useIsMobile()
  const [notifs, setNotifs] = useState([])
  const [openNotif, setOpenNotif] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Close drawer on every route change
  useEffect(() => { setDrawerOpen(false) }, [loc.pathname])

  useEffect(() => {
    if (!user) return
    const sync = (s) => {
      setNotifs(s.notifications.filter(n => n.userId === user.id).sort((a, b) => b.at.localeCompare(a.at)))
    }
    sync(getState())
    return subscribe(sync)
  }, [user?.id])

  const unread = notifs.filter(n => !n.read).length
  const grouped = groupNav(navFor(user.role))
  const initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')

  const sidebarOpen = !isMobile || drawerOpen

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '252px 1fr',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Mobile backdrop */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          zIndex: 40, animation: 'fadeUp 0.18s ease both',
        }} />
      )}
      {/* Sidebar */}
      <aside style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0,
        width: isMobile ? 268 : 'auto',
        height: '100vh',
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: isMobile ? 'transform 0.22s ease' : 'none',
        boxShadow: isMobile && sidebarOpen ? 'var(--shadow-lg)' : 'none',
      }}>
        {/* Brand */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 11,
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--slate-800), var(--slate-900))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), var(--shadow-sm)',
          }}>
            <I.GraduationCap size={18} />
          </div>
          <div style={{ minWidth: 0, lineHeight: 1.1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, letterSpacing: '-0.015em' }}>STGS</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>ФИНКИ · УКИМ</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {grouped.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{
                padding: '4px 10px 8px',
                fontSize: 10.5,
                color: 'var(--fg-faint)',
              }}>{group.label}</div>
              {group.items.map(item => {
                const Icon = item.Icon
                return (
                  <NavLink key={item.to} to={item.to} end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px',
                      margin: '1px 0',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                      background: isActive ? 'var(--bg-subtle)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background 0.12s, color 0.12s',
                      letterSpacing: '-0.005em',
                    })}
                    onMouseEnter={e => { if (!e.currentTarget.style.background || e.currentTarget.style.background === 'transparent') e.currentTarget.style.background = 'var(--bg-subtle)' }}
                    onMouseLeave={e => { if (!e.currentTarget.classList.contains('active') && e.currentTarget.getAttribute('aria-current') !== 'page') e.currentTarget.style.background = '' }}>
                    {({ isActive }) => (
                      <>
                        <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--fg-subtle)' }} />
                        <span style={{ flex: 1 }}>{t('nav.' + item.key)}</span>
                        {item.badge && <Badge tone={item.badgeTone ?? 'neutral'} size="sm">{item.badge}</Badge>}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User block */}
        <div style={{
          padding: 12,
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: 'var(--slate-200)',
            color: 'var(--slate-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600,
            border: '1px solid var(--border)',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 1 }}>{t('roles.' + user.role)}</div>
          </div>
          <button
            title={t('common.logout')}
            onClick={() => { logout(); nav('/login') }}
            style={{
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--fg-subtle)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--fg-subtle)' }}>
            <I.LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: isMobile ? '10px 14px' : '12px 28px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 10,
          minHeight: 56,
        }}>
          {isMobile && (
            <button onClick={() => setDrawerOpen(o => !o)}
              aria-label="Menu"
              style={{
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--fg)',
              }}>
              <I.Menu size={18} />
            </button>
          )}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--fg-muted)', fontSize: 12.5,
            minWidth: 0, overflow: 'hidden',
          }}>
            <span style={{ color: 'var(--fg-subtle)' }}>STGS</span>
            {!isMobile && <>
              <I.ChevronRight size={12} />
              <span style={{
                color: 'var(--fg-soft)', fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{t('app.fullName')}</span>
            </>}
          </div>
          <BackendBadge />
          <LangSwitch />
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setOpenNotif(o => !o)} style={{
              position: 'relative',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--fg-muted)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--surface-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.background = 'var(--surface)' }}>
              <I.Bell size={16} />
              {unread > 0 && <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8, borderRadius: 999,
                background: 'var(--red-500)', boxShadow: '0 0 0 2px var(--bg)',
              }} />}
            </button>
            {openNotif && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 380, maxHeight: 460, overflow: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                animation: 'fadeUp 0.18s ease both',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Известувања</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 1 }}>{t('common.totalRecords', { count: notifs.length })}</div>
                  </div>
                  {unread > 0 && <Badge tone="info" size="sm">{unread} нови</Badge>}
                </div>
                {notifs.length === 0 && <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>{t('dashboard.noActivity')}</div>}
                {notifs.map(n => (
                  <button key={n.id} onClick={() => markNotificationRead(n.id)} style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-soft)',
                    background: n.read ? 'transparent' : 'var(--accent-soft)',
                    border: 'none',
                    borderLeft: n.read ? '2px solid transparent' : '2px solid var(--accent)',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    display: 'flex', gap: 10,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: n.read ? 'var(--border-strong)' : 'var(--accent)',
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
        <main style={{
          flex: 1,
          padding: isMobile ? '20px 14px 56px' : '28px 32px 56px',
          overflow: 'auto',
        }}>
          <div className="reveal reveal-1">{children}</div>
        </main>
      </div>
    </div>
  )
}

function navFor(role) {
  const dashboard = [{ to: '/', key: 'dashboard', Icon: I.Home, end: true, section: 'overview' }]
  if (role === 'Applicant') {
    return [
      ...dashboard,
      { to: '/applications', key: 'applications', Icon: I.FileText, section: 'work' },
      { to: '/applications/new', key: 'newApplication', Icon: I.FilePlus, section: 'work' },
      { to: '/reports', key: 'expenseReports', Icon: I.Receipt, section: 'work' },
    ]
  }
  if (role === 'ScientificCouncil' || role === 'DeanOffice') {
    return [
      ...dashboard,
      { to: '/approvals', key: 'approvals', Icon: I.CheckCircle, section: 'work' },
      { to: '/applications', key: 'applications', Icon: I.FileText, section: 'work' },
      ...(role === 'DeanOffice' ? [{ to: '/budget', key: 'budget', Icon: I.BarChart, section: 'finance' }] : []),
    ]
  }
  if (role === 'Accounting') {
    return [
      ...dashboard,
      { to: '/reconciliation', key: 'reconciliation', Icon: I.Scales, section: 'finance' },
      { to: '/budget', key: 'budget', Icon: I.BarChart, section: 'finance' },
      { to: '/applications', key: 'applications', Icon: I.FileText, section: 'work' },
    ]
  }
  if (role === 'Archive' || role === 'HR') {
    return [
      ...dashboard,
      { to: '/applications', key: 'applications', Icon: I.FileText, section: 'work' },
    ]
  }
  if (role === 'SystemAdmin') {
    return [
      ...dashboard,
      { to: '/applications', key: 'applications', Icon: I.FileText, section: 'work' },
      { to: '/budget', key: 'budget', Icon: I.BarChart, section: 'finance' },
      { to: '/audit', key: 'audit', Icon: I.Shield, section: 'records' },
    ]
  }
  return dashboard
}

function groupNav(items) {
  const order = ['overview', 'work', 'finance', 'records']
  const labels = { overview: 'Преглед', work: 'Работа', finance: 'Финансии', records: 'Архива' }
  const groups = {}
  for (const item of items) {
    const k = item.section ?? 'overview'
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
  }
  return order.filter(k => groups[k]).map(k => ({ label: labels[k], items: groups[k] }))
}
