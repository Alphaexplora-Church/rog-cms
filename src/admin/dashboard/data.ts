import { isFetchError, useFetchClient, type FetchClient } from '@strapi/strapi/admin'
import { useEffect, useRef, useState } from 'react'

/**
 * Dashboard — every read the five widgets make, in one place.
 *
 * Same approach as the wizards (see ../messages/api.ts): Strapi's own ADMIN
 * API with the logged-in editor's session. No API token, no new server
 * routes, role permissions still apply. Nothing here writes.
 *
 * The five widgets mount independently and all need overlapping data, so
 * `loadDashboard` fetches everything once and hands the same promise to
 * whoever asks within CACHE_MS. One page load = one round of requests, not
 * five. A fresh visit to the homepage after CACHE_MS refetches.
 */

const CM = '/content-manager/collection-types'

export const UID = {
  sermon: 'api::sermon.sermon',
  series: 'api::series.series',
  event: 'api::event.event',
  speaker: 'api::speaker.speaker',
  topic: 'api::topic.topic',
} as const

const CACHE_MS = 30_000
const PAGE = 100
const MAX_PAGES = 30

type Raw = Record<string, any>

export type Status = 'draft' | 'published' | 'modified'

/** True for anything the public site can currently see. */
export const isLive = (s: Status) => s !== 'draft'

export interface SermonRow {
  documentId: string
  title: string
  category: 'sermon' | 'series'
  /** YYYY-MM-DD the message was preached. */
  date: string | null
  status: Status
  /** NOT reliable here: the Content Manager list returns each entry's DRAFT
   *  row, and a draft row has no publishedAt. Use updatedAt for "how recent". */
  publishedAt: string | null
  updatedAt: string | null
  mediaType: 'youtube' | 'upload'
  seriesId: string | null
  seriesTitle: string | null
  /** Did the list response include these fields at all? If not, the matching
   *  checks are skipped rather than reporting every message as missing. */
  seriesKnown: boolean
  speakerKnown: boolean
  hasSpeaker: boolean
  thumbnailKnown: boolean
  hasThumbnail: boolean
}

export interface SeriesRow {
  documentId: string
  title: string
  status: Status
  publishedAt: string | null
  updatedAt: string | null
  coverKnown: boolean
  hasCover: boolean
}

export interface EventRow {
  documentId: string
  eventName: string
  eventDate: string | null
  eventTime: string | null
  eventLocation: string | null
  status: Status
  updatedAt: string | null
}

export interface DashboardData {
  sermons: SermonRow[]
  series: SeriesRow[]
  events: EventRow[]
  speakerCount: number | null
  topicCount: number | null
}

const asStatus = (v: unknown): Status => (v === 'published' || v === 'modified' ? v : 'draft')
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object'

async function listAll(client: FetchClient, uid: string, sort: string): Promise<Raw[]> {
  const out: Raw[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await client.get<{ results: Raw[]; pagination: { pageCount: number } }>(
      `${CM}/${uid}?page=${page}&pageSize=${PAGE}&sort=${sort}`
    )
    out.push(...data.results)
    if (page >= (data.pagination?.pageCount ?? 1)) break
  }
  return out
}

async function countOf(client: FetchClient, uid: string): Promise<number | null> {
  try {
    const { data } = await client.get<{ pagination: { total: number } }>(`${CM}/${uid}?page=1&pageSize=1`)
    return data.pagination?.total ?? null
  } catch {
    return null
  }
}

function toSermon(r: Raw): SermonRow {
  return {
    documentId: r.documentId,
    title: String(r.title ?? 'Untitled'),
    category: r.category === 'series' ? 'series' : 'sermon',
    date: r.date ?? null,
    status: asStatus(r.status),
    publishedAt: r.publishedAt ?? null,
    updatedAt: r.updatedAt ?? null,
    mediaType: r.mediaType === 'upload' ? 'upload' : 'youtube',
    seriesId: isObj(r.series) ? (r.series.documentId ?? null) : null,
    seriesTitle: isObj(r.series) ? (r.series.title ?? null) : null,
    seriesKnown: 'series' in r,
    speakerKnown: 'speaker' in r,
    hasSpeaker: isObj(r.speaker),
    thumbnailKnown: 'thumbnail' in r,
    hasThumbnail: isObj(r.thumbnail),
  }
}

function toSeries(r: Raw): SeriesRow {
  return {
    documentId: r.documentId,
    title: String(r.title ?? 'Untitled'),
    status: asStatus(r.status),
    publishedAt: r.publishedAt ?? null,
    updatedAt: r.updatedAt ?? null,
    coverKnown: 'coverImage' in r,
    hasCover: isObj(r.coverImage),
  }
}

function toEvent(r: Raw): EventRow {
  return {
    documentId: r.documentId,
    eventName: String(r.eventName ?? 'Untitled event'),
    eventDate: r.eventDate ?? null,
    eventTime: r.eventTime ?? null,
    eventLocation: r.eventLocation ?? null,
    status: asStatus(r.status),
    updatedAt: r.updatedAt ?? null,
  }
}

async function fetchAll(client: FetchClient): Promise<DashboardData> {
  const [sermons, series, events, speakerCount, topicCount] = await Promise.all([
    listAll(client, UID.sermon, 'date:DESC'),
    listAll(client, UID.series, 'title:ASC'),
    listAll(client, UID.event, 'eventDate:ASC'),
    countOf(client, UID.speaker),
    countOf(client, UID.topic),
  ])
  return {
    sermons: sermons.map(toSermon),
    series: series.map(toSeries),
    events: events.map(toEvent),
    speakerCount,
    topicCount,
  }
}

let cache: { at: number; promise: Promise<DashboardData> } | null = null

export function loadDashboard(client: FetchClient): Promise<DashboardData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.promise
  const promise = fetchAll(client)
  cache = { at: Date.now(), promise }
  // A failed load must not be served from cache for the next 30 seconds.
  promise.catch(() => {
    if (cache?.promise === promise) cache = null
  })
  return promise
}

function errorText(e: unknown): string {
  if (isFetchError(e)) {
    const msg = e.response?.data?.error?.message
    if (msg) return msg
  }
  if (e instanceof Error && e.message) return e.message
  return 'Could not load this.'
}

export interface DashboardState {
  loading: boolean
  error?: string
  data?: DashboardData
}

export function useDashboard(): DashboardState {
  const client = useFetchClient()
  // The client object's identity is not guaranteed stable across renders;
  // holding it in a ref keeps the load to exactly once per mount.
  const clientRef = useRef(client)
  clientRef.current = client
  const [state, setState] = useState<DashboardState>({ loading: true })

  useEffect(() => {
    let alive = true
    loadDashboard(clientRef.current)
      .then((data) => alive && setState({ loading: false, data }))
      .catch((e) => alive && setState({ loading: false, error: errorText(e) }))
    return () => {
      alive = false
    }
  }, [])

  return state
}
