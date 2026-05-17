import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getState, subscribe } from './store.js'

const AuthCtx = createContext(null)
const LS_KEY = 'stgs_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Bootstrap session from localStorage
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        const state = getState()
        const u = state.users.find(x => x.id === session.userId)
        if (u) setUser(u)
      }
    } catch {}
    setReady(true)
  }, [])

  // If users are updated in the store (e.g., limit transfers), refresh active user
  useEffect(() => {
    if (!user) return
    return subscribe((s) => {
      const fresh = s.users.find(x => x.id === user.id)
      if (fresh) setUser(fresh)
    })
  }, [user?.id])

  const loginAs = useCallback((userId) => {
    const state = getState()
    const u = state.users.find(x => x.id === userId)
    if (!u) return false
    localStorage.setItem(LS_KEY, JSON.stringify({ userId: u.id, at: new Date().toISOString() }))
    setUser(u)
    return true
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, ready, loginAs, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function hasRole(user, ...roles) {
  return user && roles.includes(user.role)
}
