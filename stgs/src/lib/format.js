import i18n from './i18n.js'

export function formatMoney(amount, opts = {}) {
  const n = Number(amount ?? 0)
  const lang = i18n.language || 'mk'
  const locale = lang === 'mk' ? 'mk-MK' : 'en-US'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(n) + ' ' + (opts.currency ?? 'МКД')
}

export function formatDate(date, opts = {}) {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const lang = i18n.language || 'mk'
  const locale = lang === 'mk' ? 'mk-MK' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: opts.long ? 'long' : '2-digit',
    year: 'numeric',
    ...(opts.withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

export function formatDateTime(date) {
  return formatDate(date, { withTime: true })
}

export function daysBetween(from, to) {
  if (!from || !to) return 0
  const f = new Date(from); const t = new Date(to)
  return Math.max(1, Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

export function hoursSince(when) {
  if (!when) return 0
  return Math.round((Date.now() - new Date(when).getTime()) / (1000 * 60 * 60))
}

export function relativeTime(when) {
  if (!when) return ''
  const diffMs = Date.now() - new Date(when).getTime()
  const min = Math.round(diffMs / 60000)
  const lang = i18n.language || 'mk'
  if (min < 1) return lang === 'mk' ? 'пред малку' : 'just now'
  if (min < 60) return lang === 'mk' ? `пред ${min} мин` : `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return lang === 'mk' ? `пред ${hr} ч` : `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return lang === 'mk' ? `пред ${d} дена` : `${d}d ago`
  return formatDate(when)
}

export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  const af = new Date(aFrom).getTime(); const at = new Date(aTo).getTime()
  const bf = new Date(bFrom).getTime(); const bt = new Date(bTo).getTime()
  return af <= bt && bf <= at
}
