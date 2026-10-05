import { isFetchError, type FetchClient } from '@strapi/strapi/admin'

/**
 * Ministries wizard — every call it makes to the CMS (2026-09-28).
 *
 * Same approach as ../events/api.ts and ../messages/api.ts: Strapi's own
 * ADMIN API (the endpoints the standard Content Manager form calls), with
 * the logged-in editor's session — no API token, no custom server routes,
 * the editor's role permissions still apply.
 *
 * One collection, `api::ministry.ministry`, for all three kinds. The
 * `ministryType` field decides which section of the website a ministry
 * shows in and which fields the wizard asks for (see FIELDS_BY_TYPE).
 */

export const UID = {
  ministry: 'api::ministry.ministry',
} as const

const CM = '/content-manager/collection-types'

/** Same cap as the other two wizards (Strapi's body-parser default). */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

export const MINISTRIES_PAGE_SIZE = 10

export type MinistryType = 'ages' | 'service' | 'body'

export const TYPE_LABEL: Record<MinistryType, string> = {
  ages: 'Ages of the River',
  service: 'Service Ministries',
  body: 'Body of Christ Ministries',
}

/** What each type asks for in Phase 2, in the order Jude listed them. */
export type Field =
  | 'name'
  | 'ages'
  | 'subtitle'
  | 'description'
  | 'quote'
  | 'contactName'
  | 'contactNumber'
  | 'hashtags'
  | 'coverPhoto'

export const FIELDS_BY_TYPE: Record<MinistryType, Field[]> = {
  ages: ['name', 'ages', 'description', 'coverPhoto'],
  service: ['name', 'description', 'quote', 'contactName', 'contactNumber', 'hashtags', 'coverPhoto'],
  body: ['name', 'subtitle', 'description', 'coverPhoto'],
}

/** "Ministry Name" for two types, "Title" for Body of Christ (Jude's words). */
export function nameLabel(t: MinistryType | null): string {
  return t === 'body' ? 'Title' : 'Ministry Name'
}

export interface MediaFile {
  id: number
  url: string
  name: string
  mime: string
}

export interface FileSlot {
  existing?: MediaFile
  file?: File
}

export interface MinistryDraft {
  documentId?: string
  slug?: string
  ministryType: MinistryType | null
  name: string
  ages: string
  subtitle: string
  description: string
  quote: string
  contactName: string
  contactNumber: string
  hashtags: string
  coverPhoto: FileSlot | null
}

export const EMPTY_DRAFT: MinistryDraft = {
  ministryType: null,
  name: '',
  ages: '',
  subtitle: '',
  description: '',
  quote: '',
  contactName: '',
  contactNumber: '',
  hashtags: '',
  coverPhoto: null,
}

export interface MinistryRow {
  documentId: string
  name: string
  ministryType: MinistryType
  /** The one detail that tells rows of the same type apart in the list. */
  detail: string
  status: 'draft' | 'published' | 'modified'
}

/* ── helpers ─────────────────────────────────────────────────────────── */

type Raw = Record<string, any>

function toMedia(raw: Raw | null | undefined): MediaFile | null {
  if (!raw || typeof raw !== 'object' || raw.id == null) return null
  return { id: raw.id, url: raw.url, name: raw.name, mime: raw.mime }
}

export function errorMessage(e: unknown): string {
  if (isFetchError(e)) {
    const msg = e.response?.data?.error?.message
    if (msg) return msg
  }
  if (e instanceof Error && e.message) return e.message
  return 'Something went wrong. Please try again.'
}

/** "Ages 3–12" for a range, the phrase itself for "Married couples" —
 *  the same rule the website uses for the panel's kicker. */
export function agesLabel(ages: string | null | undefined): string {
  const v = (ages ?? '').trim()
  if (!v) return ''
  return /\d/.test(v) ? `Ages ${v}` : v
}

function detailOf(r: Raw): string {
  if (r.ministryType === 'ages') return agesLabel(r.ages)
  if (r.ministryType === 'body') return r.subtitle ?? ''
  return [r.contactName, r.contactNumber].filter(Boolean).join(' · ')
}

/* ── reads ───────────────────────────────────────────────────────────── */

export async function listMinistries(
  client: FetchClient,
  { page, query, type }: { page: number; query: string; type: MinistryType | 'all' }
): Promise<{ rows: MinistryRow[]; pageCount: number; total: number }> {
  // Oldest first = the order they appear on the website.
  const q = new URLSearchParams({ page: String(page), pageSize: String(MINISTRIES_PAGE_SIZE), sort: 'createdAt:ASC' })
  if (query.trim()) q.set('_q', query.trim())
  if (type !== 'all') q.set('filters[$and][0][ministryType][$eq]', type)
  const { data } = await client.get<{ results: Raw[]; pagination: { pageCount: number; total: number } }>(
    `${CM}/${UID.ministry}?${q}`
  )
  return {
    rows: data.results.map((r) => ({
      documentId: r.documentId,
      name: r.name,
      ministryType: r.ministryType,
      detail: detailOf(r),
      status: r.status ?? 'draft',
    })),
    pageCount: data.pagination?.pageCount ?? 1,
    total: data.pagination?.total ?? data.results.length,
  }
}

export async function loadMinistry(client: FetchClient, documentId: string): Promise<MinistryDraft> {
  const { data } = await client.get<{ data: Raw }>(`${CM}/${UID.ministry}/${documentId}`)
  const s = data.data
  const photo = toMedia(s.coverPhoto)
  return {
    documentId,
    slug: s.slug,
    ministryType: s.ministryType ?? null,
    name: s.name ?? '',
    ages: s.ages ?? '',
    subtitle: s.subtitle ?? '',
    description: s.description ?? '',
    quote: s.quote ?? '',
    contactName: s.contactName ?? '',
    contactNumber: s.contactNumber ?? '',
    hashtags: s.hashtags ?? '',
    coverPhoto: photo ? { existing: photo } : null,
  }
}

/* ── writes ──────────────────────────────────────────────────────────── */

async function generateSlug(client: FetchClient, value: string) {
  const { data } = await client.post<{ data: string }>('/content-manager/uid/generate', {
    contentTypeUID: UID.ministry,
    field: 'slug',
    data: { name: value },
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

/** Hashtags as the editor meant them: "#A #B", whatever spacing or missing
 *  #s they typed ("MediaProduction, RMP" → "#MediaProduction #RMP"). */
export function normalizeHashtags(raw: string): string {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, '').trim())
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(' ')
}

/**
 * Upload a newly picked cover (only now, at the very end, so an abandoned
 * wizard never leaves an orphan image), then create-or-update and publish.
 *
 * Fields that don't belong to the chosen type are sent as null. That only
 * matters when an editor changes an existing ministry's type in Phase 1:
 * the old type's leftovers are cleared instead of lingering unseen.
 */
export async function publishMinistry(
  client: FetchClient,
  draft: MinistryDraft,
  onStep?: (step: PublishStep) => void
): Promise<string> {
  const type = draft.ministryType
  if (!type) throw new Error('Choose what kind of ministry this is.')
  const fields = FIELDS_BY_TYPE[type]
  const keep = (f: Field, v: string) => (fields.includes(f) ? v.trim() || null : null)

  let photoId: number | null = draft.coverPhoto?.existing?.id ?? null
  if (draft.coverPhoto?.file) {
    onStep?.('photo')
    photoId = (await uploadFile(client, draft.coverPhoto.file)).id
  }
  onStep?.('saving')

  const body: Raw = {
    ministryType: type,
    name: draft.name.trim(),
    description: draft.description.trim(),
    ages: keep('ages', draft.ages.replace(/(\d)\s*[-–—]\s*(\d)/g, '$1–$2')),
    subtitle: keep('subtitle', draft.subtitle),
    quote: keep('quote', draft.quote),
    contactName: keep('contactName', draft.contactName),
    contactNumber: keep('contactNumber', draft.contactNumber),
    hashtags: fields.includes('hashtags') ? normalizeHashtags(draft.hashtags) || null : null,
    coverPhoto: photoId,
  }

  if (draft.documentId) {
    // Editing keeps the slug, so a shared link doesn't change under anyone.
    const { data } = await client.post<{ data: Raw }>(`${CM}/${UID.ministry}/${draft.documentId}/actions/publish`, body)
    return data.data.documentId
  }

  body.slug = await generateSlug(client, body.name)
  const { data } = await client.post<{ data: Raw }>(`${CM}/${UID.ministry}/actions/publish`, body)
  return data.data.documentId
}

/** Permanently delete one ministry (draft and published copies). Uploaded
 *  files stay in the Media Library. Added 2026-09-29. */
export async function deleteMinistry(client: FetchClient, documentId: string): Promise<void> {
  await client.del(`${CM}/${UID.ministry}/${documentId}`)
}
