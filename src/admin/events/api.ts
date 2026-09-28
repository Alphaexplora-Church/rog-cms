import { isFetchError, type FetchClient } from '@strapi/strapi/admin'

/**
 * Event wizard — every call it makes to the CMS.
 *
 * Same approach as ../messages/api.ts: everything goes through Strapi's own
 * ADMIN API (the same endpoints the standard Content Manager form calls),
 * using the logged-in editor's session — no API token, no custom server
 * routes, the editor's role permissions still apply.
 *
 * Endpoint shapes checked against a running Strapi 5.53 on 2026-09-24 (the
 * same disposable test instance used for the Media Library build), not
 * taken from memory.
 */

export const UID = {
  event: 'api::event.event',
} as const

const CM = '/content-manager/collection-types'

/** Same cap as the Media Library wizard — Formidable's default request cap
 *  in Strapi's body middleware. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

/** Events list page size, matching Media Library's "10 contents lang tapos
 *  next page na" convention. */
export const EVENTS_PAGE_SIZE = 10

export interface MediaFile {
  id: number
  url: string
  name: string
  mime: string
}

/** A file slot in the form: either something already in the CMS, or a file
 *  just picked on this computer that uploads when the editor publishes. */
export interface FileSlot {
  existing?: MediaFile
  file?: File
}

export interface EventDraft {
  documentId?: string
  slug?: string
  eventName: string
  /** YYYY-MM-DD */
  eventDate: string
  /** Strapi's stored HH:mm:ss.SSS. The TimeWheel works in "HH:mm";
   *  ContentStep converts at the field (toIsoTime/fromIsoTime, rules.ts). */
  eventTime: string
  /** Where it happens — added 2026-09-25 (Jude: "lagyan mo din pala ng
   *  Event Location"). */
  eventLocation: string
  eventDescription: string
  headerPhoto: FileSlot | null
}

export const EMPTY_DRAFT: EventDraft = {
  eventName: '',
  eventDate: '',
  eventTime: '',
  eventLocation: '',
  eventDescription: '',
  headerPhoto: null,
}

export interface EventRow {
  documentId: string
  eventName: string
  eventDate: string | null
  eventTime: string | null
  eventLocation: string | null
  status: 'draft' | 'published' | 'modified'
}

/* ── helpers ─────────────────────────────────────────────────────────── */

type Raw = Record<string, any>

function toMedia(raw: Raw | null | undefined): MediaFile | null {
  if (!raw || typeof raw !== 'object' || raw.id == null) return null
  return { id: raw.id, url: raw.url, name: raw.name, mime: raw.mime }
}

/** The editor-facing message out of a failed call. Strapi's own error text
 *  comes through as-is. */
export function errorMessage(e: unknown): string {
  if (isFetchError(e)) {
    const msg = e.response?.data?.error?.message
    if (msg) return msg
  }
  if (e instanceof Error && e.message) return e.message
  return 'Something went wrong. Please try again.'
}

/** Relative `/uploads/...` URLs are served by the CMS itself, which is the
 *  origin this admin runs on, so they work as-is. Absolute (GCS) URLs too. */
export function mediaSrc(file: MediaFile | null | undefined): string | undefined {
  return file?.url
}

/* ── reads ───────────────────────────────────────────────────────────── */

export async function listEvents(
  client: FetchClient,
  { page, query }: { page: number; query: string }
): Promise<{ rows: EventRow[]; pageCount: number; total: number }> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(EVENTS_PAGE_SIZE), sort: 'eventDate:DESC' })
  if (query.trim()) q.set('_q', query.trim())
  const { data } = await client.get<{
    results: Raw[]
    pagination: { pageCount: number; total: number }
  }>(`${CM}/${UID.event}?${q}`)

  return {
    rows: data.results.map((r) => ({
      documentId: r.documentId,
      eventName: r.eventName,
      eventDate: r.eventDate ?? null,
      eventTime: r.eventTime ?? null,
      eventLocation: r.eventLocation ?? null,
      status: r.status ?? 'draft',
    })),
    pageCount: data.pagination?.pageCount ?? 1,
    total: data.pagination?.total ?? data.results.length,
  }
}

/** One saved event, shaped for the wizard. */
export async function loadEvent(client: FetchClient, documentId: string): Promise<EventDraft> {
  const { data } = await client.get<{ data: Raw }>(`${CM}/${UID.event}/${documentId}`)
  const s = data.data
  const photo = toMedia(s.headerPhoto)

  return {
    documentId,
    slug: s.slug,
    eventName: s.eventName ?? '',
    eventDate: s.eventDate ?? '',
    eventTime: s.eventTime ?? '',
    eventLocation: s.eventLocation ?? '',
    eventDescription: s.eventDescription ?? '',
    headerPhoto: photo ? { existing: photo } : null,
  }
}

/* ── writes ──────────────────────────────────────────────────────────── */

/** Strapi's own slug generator — the one behind the ↻ button on a UID
 *  field. It appends -1, -2… when the slug is already taken. */
async function generateSlug(client: FetchClient, uid: string, field: string, value: string) {
  const { data } = await client.post<{ data: string }>('/content-manager/uid/generate', {
    contentTypeUID: uid,
    field: 'slug',
    data: { [field]: value },
  })
  return data.data
}

export async function uploadFile(client: FetchClient, file: File): Promise<MediaFile> {
  const form = new FormData()
  form.append('files', file, file.name)
  const { data } = await client.post<Raw[]>('/upload', form)
  const media = toMedia(data?.[0])
  if (!media) throw new Error(`“${file.name}” didn’t upload. Please try again.`)
  return media
}

export type PublishStep = 'photo' | 'saving'

/**
 * Upload the header photo if a new one was picked, then create-or-update
 * the event and publish it, in one go. The file uploads here, at the very
 * end, so that abandoning the wizard halfway never leaves an orphan image
 * in the Media Library.
 */
export async function publishEvent(
  client: FetchClient,
  draft: EventDraft,
  onStep?: (step: PublishStep) => void
): Promise<string> {
  let photoId: number | null = draft.headerPhoto?.existing?.id ?? null
  if (draft.headerPhoto?.file) {
    onStep?.('photo')
    photoId = (await uploadFile(client, draft.headerPhoto.file)).id
  }

  onStep?.('saving')

  const body: Raw = {
    eventName: draft.eventName.trim(),
    eventDate: draft.eventDate,
    eventTime: draft.eventTime,
    eventLocation: draft.eventLocation.trim(),
    eventDescription: draft.eventDescription.trim(),
    headerPhoto: photoId,
  }

  if (draft.documentId) {
    // Editing keeps the slug, so the event's web address doesn't change
    // under anyone who has already shared it.
    const { data } = await client.post<{ data: Raw }>(
      `${CM}/${UID.event}/${draft.documentId}/actions/publish`,
      body
    )
    return data.data.documentId
  }

  body.slug = await generateSlug(client, UID.event, 'eventName', body.eventName)
  const { data } = await client.post<{ data: Raw }>(`${CM}/${UID.event}/actions/publish`, body)
  return data.data.documentId
}
