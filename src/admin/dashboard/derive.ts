import { isLive, type DashboardData, type SermonRow } from './data'
import {
  ATTENTION_PREVIEW,
  MONTHS_SHOWN,
  STALE_DRAFT_DAYS,
  UPCOMING_EVENTS_SHOWN,
  ago,
  daysSince,
  formatDay,
  isoToday,
  lastMonths,
  lastSunday,
  isSunday,
  plural,
} from './rules'

/**
 * Dashboard — turns the raw lists from ./data into what each widget shows.
 * Pure functions of (data, now), so they are easy to reason about and
 * nothing here touches the network.
 */

export const PATH = {
  messages: '/manage-contents/media-library',
  newMessage: '/manage-contents/media-library/new',
  message: (id: string) => `/manage-contents/media-library/${id}`,
  events: '/manage-contents/events',
  newEvent: '/manage-contents/events/new',
  event: (id: string) => `/manage-contents/events/${id}`,
  ministries: '/manage-contents/ministries',
  newMinistry: '/manage-contents/ministries/new',
} as const

/* ── Sunday status ──────────────────────────────────────────────────── */

export interface SundayStatus {
  latestMessage: SermonRow | null
  latestMessageAgo: string
  latestSeries: { title: string; episodes: number; lastEpisodeDate: string | null } | null
  /** The Sunday the site should already have a message for. */
  dueSunday: string
  /** ok = a live message is dated on/after dueSunday. */
  state: 'ok' | 'waiting' | 'missing'
}

const byNewest = (a: SermonRow, b: SermonRow) =>
  (b.date ?? '').localeCompare(a.date ?? '') || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')

export function sundayStatus(data: DashboardData, now: Date = new Date()): SundayStatus {
  const live = data.sermons.filter((s) => isLive(s.status) && s.date).sort(byNewest)
  const latestMessage = live[0] ?? null

  const dueSunday = lastSunday(now)
  const has = live.some((s) => (s.date as string) >= dueSunday)
  // On the Sunday itself the message usually isn't up until after service,
  // so that is a soft "waiting", not an alarm.
  const state: SundayStatus['state'] = has ? 'ok' : isSunday(now) ? 'waiting' : 'missing'

  // "Latest series" = the live series that most recently had an episode.
  // A series with no episodes yet can't be "what we're preaching", so it only
  // wins if no series has any (and then it is flagged under Needs attention).
  const withActivity = data.series
    .filter((s) => isLive(s.status))
    .map((s) => {
      const eps = data.sermons.filter((m) => m.seriesId === s.documentId)
      const last = eps.filter((m) => m.date).sort(byNewest)[0]
      return { s, eps: eps.length, lastDate: last?.date ?? null }
    })
    .sort(
      (a, b) =>
        (b.lastDate ?? '').localeCompare(a.lastDate ?? '') ||
        (b.s.updatedAt ?? '').localeCompare(a.s.updatedAt ?? '')
    )
  const pick = withActivity[0]
  const latestSeries: SundayStatus['latestSeries'] = pick
    ? { title: pick.s.title, episodes: pick.eps, lastEpisodeDate: pick.lastDate }
    : null

  return {
    latestMessage,
    latestMessageAgo: ago(latestMessage?.updatedAt),
    latestSeries,
    dueSunday,
    state,
  }
}

/* ── Needs attention ────────────────────────────────────────────────── */

export interface Issue {
  id: string
  label: string
  detail?: string
  to: string
}

export interface AttentionGroup {
  key: string
  title: string
  tone: 'danger' | 'warning'
  total: number
  items: Issue[]
  more: number
}

function group(key: string, title: string, tone: AttentionGroup['tone'], all: Issue[]): AttentionGroup | null {
  if (all.length === 0) return null
  return {
    key,
    title,
    tone,
    total: all.length,
    items: all.slice(0, ATTENTION_PREVIEW),
    more: Math.max(0, all.length - ATTENTION_PREVIEW),
  }
}

export function attentionGroups(data: DashboardData, today: string = isoToday()): AttentionGroup[] {
  const liveMsgs = data.sermons.filter((s) => isLive(s.status))
  const seriesChecked = data.sermons.some((s) => s.seriesKnown)

  const noSpeaker = liveMsgs
    .filter((s) => s.speakerKnown && !s.hasSpeaker)
    .map<Issue>((s) => ({ id: s.documentId, label: s.title, to: PATH.message(s.documentId) }))

  // A YouTube message gets its thumbnail automatically, and a series episode
  // falls back to its series cover — only a standalone upload needs its own.
  const noThumb = liveMsgs
    .filter((s) => s.thumbnailKnown && s.mediaType === 'upload' && s.category === 'sermon' && !s.hasThumbnail)
    .map<Issue>((s) => ({ id: s.documentId, label: s.title, to: PATH.message(s.documentId) }))

  const noCover = data.series
    .filter((s) => isLive(s.status) && s.coverKnown && !s.hasCover)
    .map<Issue>((s) => ({ id: s.documentId, label: s.title, to: PATH.messages }))

  const used = new Set(data.sermons.map((s) => s.seriesId).filter(Boolean))
  const emptySeries = seriesChecked
    ? data.series
        .filter((s) => isLive(s.status) && !used.has(s.documentId))
        .map<Issue>((s) => ({ id: s.documentId, label: s.title, to: PATH.messages }))
    : []

  const staleMsgs = data.sermons
    .filter((s) => s.status === 'draft' && (daysSince(s.updatedAt) ?? 0) >= STALE_DRAFT_DAYS)
    .map<Issue>((s) => ({
      id: s.documentId,
      label: s.title,
      detail: `Message · untouched ${ago(s.updatedAt).replace(' ago', '')}`,
      to: PATH.message(s.documentId),
    }))
  const staleEvents = data.events
    .filter((e) => e.status === 'draft' && (daysSince(e.updatedAt) ?? 0) >= STALE_DRAFT_DAYS)
    .map<Issue>((e) => ({
      id: e.documentId,
      label: e.eventName,
      detail: `Event · untouched ${ago(e.updatedAt).replace(' ago', '')}`,
      to: PATH.event(e.documentId),
    }))

  const pastEvents = data.events
    .filter((e) => isLive(e.status) && e.eventDate && e.eventDate < today)
    .sort((a, b) => (b.eventDate as string).localeCompare(a.eventDate as string))
    .map<Issue>((e) => ({
      id: e.documentId,
      label: e.eventName,
      detail: `Happened ${formatDay(e.eventDate as string)}`,
      to: PATH.event(e.documentId),
    }))

  return [
    group('past-events', `${plural(pastEvents.length, 'past event')} still live on the site`, 'danger', pastEvents),
    group('no-speaker', `${plural(noSpeaker.length, 'live message')} with no speaker`, 'warning', noSpeaker),
    group('no-thumb', `${plural(noThumb.length, 'uploaded message')} with no thumbnail`, 'warning', noThumb),
    group('no-cover', `${plural(noCover.length, 'series', 'series')} with no cover image`, 'warning', noCover),
    group('empty-series', `${plural(emptySeries.length, 'live series', 'live series')} with no episodes`, 'warning', emptySeries),
    group(
      'stale-drafts',
      `${plural(staleMsgs.length + staleEvents.length, 'draft')} untouched for ${STALE_DRAFT_DAYS}+ days`,
      'warning',
      [...staleMsgs, ...staleEvents]
    ),
  ].filter((g): g is AttentionGroup => g !== null)
}

/* ── Upcoming events ────────────────────────────────────────────────── */

export function upcomingEvents(data: DashboardData, today: string = isoToday()) {
  const all = data.events
    .filter((e) => isLive(e.status) && e.eventDate && e.eventDate >= today)
    .sort(
      (a, b) =>
        (a.eventDate as string).localeCompare(b.eventDate as string) ||
        (a.eventTime ?? '').localeCompare(b.eventTime ?? '')
    )
  return { shown: all.slice(0, UPCOMING_EVENTS_SHOWN), total: all.length }
}

/* ── Library snapshot ───────────────────────────────────────────────── */

export function librarySnapshot(data: DashboardData, now: Date = new Date()) {
  const live = data.sermons.filter((s) => isLive(s.status))
  const months = lastMonths(MONTHS_SHOWN, now).map((m) => ({
    ...m,
    count: live.filter((s) => s.date && s.date.slice(0, 7) === m.key).length,
  }))
  const youtube = live.filter((s) => s.mediaType === 'youtube').length
  const upload = live.filter((s) => s.mediaType === 'upload').length
  return {
    messages: data.sermons.length,
    live: live.length,
    drafts: data.sermons.length - live.length,
    series: data.series.length,
    speakers: data.speakerCount,
    topics: data.topicCount,
    months,
    maxMonth: Math.max(1, ...months.map((m) => m.count)),
    youtube,
    upload,
  }
}
