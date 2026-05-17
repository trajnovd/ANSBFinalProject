import { useEffect, useState } from 'react'
import { supabase, hasBackend } from '../lib/supabase.js'
import { Badge } from './ui.jsx'

/**
 * BackendBadge — surfaces which persistence layer the app is running against.
 *
 * - No env vars set      → "Демо · localStorage"  (neutral)
 * - Env vars set & ping  → "Supabase · live"      (info, green)
 * - Env vars but no ping → "Supabase · недостапно" (warning)
 *
 * Visible in the AppShell header so during the presentation it's instantly
 * clear whether we're hitting the live DB or the offline fixture.
 */
export default function BackendBadge() {
  const [state, setState] = useState(hasBackend ? 'connecting' : 'demo')

  useEffect(() => {
    if (!hasBackend) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('ping')
        if (cancelled) return
        setState(error || data !== 'pong' ? 'error' : 'live')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state === 'demo') {
    return <Badge tone="neutral" size="sm" dot>Демо · localStorage</Badge>
  }
  if (state === 'connecting') {
    return <Badge tone="neutral" size="sm" dot>Supabase · поврзување…</Badge>
  }
  if (state === 'error') {
    return <Badge tone="warning" size="sm" dot>Supabase · недостапно</Badge>
  }
  return <Badge tone="info" size="sm" dot>Supabase · live</Badge>
}
