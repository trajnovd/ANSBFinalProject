import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.warn('[STGS] Supabase env vars not set — falling back to offline mode')
}

export const supabase = url && anon
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const hasBackend = Boolean(supabase)
