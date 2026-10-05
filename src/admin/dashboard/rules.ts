/**
 * Dashboard — the small, pure rules the widgets share. No Strapi, no React,
 * nothing to fetch: dates, wording, and the two numbers an editor might
 * want to tune.
 *
 * Dates from Strapi's `date` fields are plain `YYYY-MM-DD` strings. They are
 * compared and formatted as strings / local dates on purpose — going through
 * `new Date('2026-09-27')` parses as UTC and shows the wrong day in any
 * timezone west of Greenwich (the same trap the message wizard avoids).
 */

/** A draft untouched for this many days is called out as "stale". */
export const STALE_DRAFT_DAYS = 14

/** How many months the "Messages per month" chart covers, ending this month. */
export const MONTHS_SHOWN = 6

/** How many items each "Needs attention" group lists before "+N more". */
export const ATTENTION_PREVIEW = 3

/** How many events "Upcoming events" shows. */
export const UPCOMING_EVENTS_SHOWN = 5

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoToday(): string {
  return toISO(new Date())
}

/** `YYYY-MM-DD` → a Date at local midnight. */
export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** The most recent Sunday on or before `from` (today counts). */
export function lastSunday(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() - d.getDay())
  return toISO(d)
}

export function isSunday(from: Date = new Date()): boolean {
  return from.getDay() === 0
}

/** "Sun, Sep 27" */
export function formatDay(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Sun, Sep 27, 2026" */
export function formatLong(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "SEP" / "27" for the little calendar tile. */
export function monthShort(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}
export function dayOfMonth(iso: string): string {
  return String(parseISO(iso).getDate())
}

/** Strapi `time` values arrive as "09:00:00.000". → "9:00 AM". */
export function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh)) return ''
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${pad(mm || 0)} ${hh < 12 ? 'AM' : 'PM'}`
}

/** Whole days between an ISO timestamp and now (never negative). */
export function daysSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null
  const t = new Date(timestamp).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function ago(timestamp: string | null | undefined): string {
  const d = daysSince(timestamp)
  if (d == null) return ''
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`
  return `${Math.floor(d / 30)} months ago`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** The last `n` calendar months, oldest first, ending with this month. */
export function lastMonths(n: number, from: Date = new Date()): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return out
}
