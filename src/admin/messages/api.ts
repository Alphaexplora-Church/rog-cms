import { isFetchError, type FetchClient } from '@strapi/strapi/admin'

/**
 * Message wizard — every call it makes to the CMS.
 *
 * All of these go through Strapi's own ADMIN API (the same endpoints the
 * standard Content Manager form calls), using the logged-in editor's
 * session. That means:
 *   · no API token, no custom server routes, nothing new to secure
 *   · the editor's role permissions still apply — someone who can't publish
 *     in the Content Manager can't publish here either
 *   · the sermon lifecycle (lifecycles.ts) still runs on every save, so the
 *     server-side rules hold even if this UI has a bug
 *
 * Endpoint shapes were checked against a running Strapi 5.53 on 2026-09-24,
 * not taken from memory — see the build log.
 */

export const UID = {
  sermon: 'api::sermon.sermon',
  series: 'api::series.series',
  speaker: 'api::speaker.speaker',
  topic: 'api::topic.topic',
  scripture: 'api::scripture.scripture',
} as const

const CM = '/content-manager/collection-types'

/** Formidable's default request cap in Strapi's body middleware. A bigger
 *  file is rejected by the server after the whole upload, so the wizard
 *  checks first and says so up front. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

/** Media Library list page size (Jude, 2026-09-24: "10 contents lang tapos
 *  next page na"). Was 20; MessageList.tsx already had prev/next paging UI
 *  wired to the server's own pageCount, so this is the only line that
 *  needed to change. */
export const MESSAGES_PAGE_SIZE = 10

export type Category = 'series' | 'sermon'
export type MediaType = 'youtube' | 'upload'

export interface MediaFile {
  id: number
  url: string
  name: string
  mime: string
}

/** A Speaker, Topic, Scripture book or Series, as a picker option. */
export interface Term {
  id: number
  documentId: string
  label: string
}

export interface SeriesTerm extends Term {
  cover: MediaFile | null
}

export type TermKind = 'speaker' | 'topic' | 'scripture'

/** Which attribute holds each type's display name. */
const LABEL_FIELD: Record<TermKind | 'series', string> = {
  speaker: 'name',
  topic: 'title',
  scripture: 'title',
  series: 'title',
}

/** A file slot in the form: either something already in the CMS, or a file
 *  just picked on this computer that uploads when the editor publishes. */
export interface FileSlot {
  existing?: MediaFile
  file?: File
}

export interface MessageDraft {
  documentId?: string
  slug?: string
  category: Category | null
  series: SeriesTerm | null
  title: string
  /** YYYY-MM-DD, the date the message was preached. */
  date: string
  mediaType: MediaType | null
  youtubeUrl: string
  video: FileSlot | null
  thumbnail: FileSlot | null
  speaker: Term | null
  topics: Term[]
  scripture: Term | null
}

export const EMPTY_DRAFT: MessageDraft = {
  category: null,
  series: null,
  title: '',
  date: '',
  mediaType: null,
  youtubeUrl: '',
  video: null,
  thumbnail: null,
  speaker: null,
  topics: [],
  scripture: null,
}

export interface MessageRow {
  documentId: string
  title: string
  category: Category
  date: string | null
  seriesTitle?: string
  speakerName?: string
  status: 'draft' | 'published' | 'modified'
}

/* ── helpers ─────────────────────────────────────────────────────────── */

type Raw = Record<string, any>

function toMedia(raw: Raw | null | undefined): MediaFile | null {
  if (!raw || typeof raw !== 'object' || raw.id == null) return null
  return { id: raw.id, url: raw.url, name: raw.name, mime: raw.mime }
}

function toTerm(raw: Raw, field: string): Term {
  return {
    id: raw.id,
    documentId: raw.documentId,
    label: String(raw[field] ?? raw.title ?? raw.name ?? raw.documentId),
  }
}

/** The editor-facing message out of a failed call. Strapi's ApplicationError
 *  text (the lifecycle's rules) comes through as-is. */
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

async function listAll(client: FetchClient, uid: string, sortField: string): Promise<Raw[]> {
  const out: Raw[] = []
  for (let page = 1; page < 50; page += 1) {
    const { data } = await client.get<{ results: Raw[]; pagination: { pageCount: number } }>(
      `${CM}/${uid}?page=${page}&pageSize=100&sort=${sortField}:ASC`
    )
    out.push(...data.results)
    if (page >= (data.pagination?.pageCount ?? 1)) break
  }
  return out
}

export async function loadTerms(client: FetchClient, kind: TermKind): Promise<Term[]> {
  const field = LABEL_FIELD[kind]
  const rows = await listAll(client, UID[kind], field)
  return rows.map((r) => toTerm(r, field))
}

export async function loadSeries(client: FetchClient): Promise<SeriesTerm[]> {
  const rows = await listAll(client, UID.series, 'title')
  return rows.map((r) => ({ ...toTerm(r, 'title'), cover: toMedia(r.coverImage) }))
}

export async function listMessages(
  client: FetchClient,
  { page, query }: { page: number; query: string }
): Promise<{ rows: MessageRow[]; pageCount: number; total: number }> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(MESSAGES_PAGE_SIZE), sort: 'date:DESC' })
  if (query.trim()) q.set('_q', query.trim())
  const { data } = await client.get<{
    results: Raw[]
    pagination: { pageCount: number; total: number }
  }>(`${CM}/${UID.sermon}?${q}`)

  return {
    rows: data.results.map((r) => ({
      documentId: r.documentId,
      title: r.title,
      category: r.category === 'series' ? 'series' : 'sermon',
      date: r.date ?? null,
      seriesTitle: r.series && typeof r.series === 'object' ? r.series.title : undefined,
      speakerName: r.speaker && typeof r.speaker === 'object' ? r.speaker.name : undefined,
      status: r.status ?? 'draft',
    })),
    pageCount: data.pagination?.pageCount ?? 1,
    total: data.pagination?.total ?? data.results.length,
  }
}

async function relationOf(client: FetchClient, documentId: string, field: string, labelField: string) {
  const { data } = await client.get<{ results: Raw[] }>(
    `/content-manager/relations/${UID.sermon}/${documentId}/${field}?page=1&pageSize=100`
  )
  return data.results.map((r) => toTerm(r, labelField))
}

/**
 * One saved message, shaped for the wizard.
 *
 * The Content Manager's findOne returns relations as `{ count }` only (its
 * own form loads them separately), so the four relations are fetched from
 * the relations endpoint — the same one the standard form uses.
 */
export async function loadMessage(
  client: FetchClient,
  documentId: string,
  seriesOptions: SeriesTerm[]
): Promise<MessageDraft> {
  const { data } = await client.get<{ data: Raw }>(`${CM}/${UID.sermon}/${documentId}`)
  const s = data.data

  const [series, speaker, topics, scripture] = await Promise.all([
    relationOf(client, documentId, 'series', 'title'),
    relationOf(client, documentId, 'speaker', 'name'),
    relationOf(client, documentId, 'topics', 'title'),
    relationOf(client, documentId, 'scripture', 'title'),
  ])

  const seriesRef = series[0]
  const seriesFull = seriesRef
    ? seriesOptions.find((o) => o.documentId === seriesRef.documentId) ?? { ...seriesRef, cover: null }
    : null

  const video = toMedia(s.videoFile)
  const thumb = toMedia(s.thumbnail)

  return {
    documentId,
    slug: s.slug,
    category: s.category === 'series' ? 'series' : 'sermon',
    series: seriesFull,
    title: s.title ?? '',
    date: s.date ?? '',
    mediaType: s.mediaType === 'upload' ? 'upload' : 'youtube',
    youtubeUrl: s.youtubeUrl ?? '',
    video: video ? { existing: video } : null,
    thumbnail: thumb ? { existing: thumb } : null,
    speaker: speaker[0] ?? null,
    topics,
    scripture: scripture[0] ?? null,
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

/** Speaker, Topic or Scripture book, created from the "Add New +" modal.
 *  These types have no draft stage, so they exist immediately. */
export async function createTerm(client: FetchClient, kind: TermKind, label: string): Promise<Term> {
  const field = LABEL_FIELD[kind]
  const uid = UID[kind]
  const slug = await generateSlug(client, uid, field, label)
  const { data } = await client.post<{ data: Raw }>(`${CM}/${uid}`, { [field]: label, slug })
  return toTerm(data.data, field)
}

/**
 * Create or update a Series, and publish it straight away.
 *
 * It has to be published before the message is: a published message can
 * only link to the PUBLISHED version of its series, so a draft-only series
 * would leave the episode orphaned on the website.
 */
export async function saveSeries(
  client: FetchClient,
  input: { documentId?: string; title: string; cover: FileSlot | null }
): Promise<SeriesTerm> {
  let coverId: number | null = input.cover?.existing?.id ?? null
  if (input.cover?.file) coverId = (await uploadFile(client, input.cover.file)).id

  let raw: Raw
  if (input.documentId) {
    const { data } = await client.post<{ data: Raw }>(
      `${CM}/${UID.series}/${input.documentId}/actions/publish`,
      { title: input.title, coverImage: coverId }
    )
    raw = data.data
  } else {
    const slug = await generateSlug(client, UID.series, 'title', input.title)
    const { data } = await client.post<{ data: Raw }>(`${CM}/${UID.series}/actions/publish`, {
      title: input.title,
      slug,
      coverImage: coverId,
    })
    raw = data.data
  }

  // The publish response doesn't populate the cover, so rebuild it from what
  // we know rather than making another request.
  let cover: MediaFile | null = input.cover?.existing ?? null
  if (input.cover?.file && coverId != null) {
    cover = { id: coverId, url: URL.createObjectURL(input.cover.file), name: input.cover.file.name, mime: input.cover.file.type }
  }
  return { ...toTerm(raw, 'title'), cover }
}

const ref = (t: Term) => ({ id: t.id, documentId: t.documentId })

/** The Content Manager's relation payload: what to add, what to remove. */
function relationDiff(next: Term[], prev: Term[]) {
  return {
    connect: next.filter((n) => !prev.some((p) => p.documentId === n.documentId)).map(ref),
    disconnect: prev.filter((p) => !next.some((n) => n.documentId === p.documentId)).map(ref),
  }
}

const one = (t: Term | null | undefined) => (t ? [t] : [])

export type PublishStep = 'video' | 'thumbnail' | 'saving'

/**
 * Upload any new files, then create-or-update the message and publish it,
 * in one go. Files upload here, at the very end, so that abandoning the
 * wizard halfway never leaves orphan videos in the Media Library.
 */
export async function publishMessage(
  client: FetchClient,
  draft: MessageDraft,
  original: MessageDraft | null,
  onStep?: (step: PublishStep) => void
): Promise<string> {
  const isUpload = draft.mediaType === 'upload'

  let videoId: number | null = null
  let thumbId: number | null = null
  if (isUpload) {
    videoId = draft.video?.existing?.id ?? null
    if (draft.video?.file) {
      onStep?.('video')
      videoId = (await uploadFile(client, draft.video.file)).id
    }
    thumbId = draft.thumbnail?.existing?.id ?? null
    if (draft.thumbnail?.file) {
      onStep?.('thumbnail')
      thumbId = (await uploadFile(client, draft.thumbnail.file)).id
    }
  }

  onStep?.('saving')

  const series = draft.category === 'series' ? one(draft.series) : []

  const body: Raw = {
    category: draft.category,
    title: draft.title.trim(),
    date: draft.date,
    mediaType: draft.mediaType,
    youtubeUrl: isUpload ? null : draft.youtubeUrl.trim(),
    videoFile: isUpload ? videoId : null,
    thumbnail: isUpload ? thumbId : null,
    series: relationDiff(series, one(original?.series)),
    speaker: relationDiff(one(draft.speaker), one(original?.speaker)),
    topics: relationDiff(draft.topics, original?.topics ?? []),
    scripture: relationDiff(one(draft.scripture), one(original?.scripture)),
  }

  if (draft.documentId) {
    // Editing keeps the slug, so the message's web address doesn't change
    // under anyone who has already shared it.
    const { data } = await client.post<{ data: Raw }>(
      `${CM}/${UID.sermon}/${draft.documentId}/actions/publish`,
      body
    )
    return data.data.documentId
  }

  body.slug = await generateSlug(client, UID.sermon, 'title', body.title)
  const { data } = await client.post<{ data: Raw }>(`${CM}/${UID.sermon}/actions/publish`, body)
  return data.data.documentId
}

/** Permanently delete one message (draft and published copies). Uploaded
 *  files stay in the Media Library. Added 2026-09-29. */
export async function deleteMessage(client: FetchClient, documentId: string): Promise<void> {
  await client.del(`${CM}/${UID.sermon}/${documentId}`)
}
