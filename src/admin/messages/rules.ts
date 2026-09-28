import { MAX_UPLOAD_BYTES, type MessageDraft } from './api'

/**
 * The wizard's own copy of the sermon rules, so the editor hears about a
 * problem on the field itself, before pressing Next — instead of from a
 * server error at the very end.
 *
 * The server (src/api/sermon/content-types/sermon/lifecycles.ts) still
 * enforces the same rules on every save. If the two ever disagree, the
 * server wins and its message is shown on the Review step.
 */

/** Same five patterns as lifecycles.ts and the website's youtube.ts. */
const YOUTUBE_URL_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
]

export function youtubeId(url: string): string | null {
  for (const p of YOUTUBE_URL_PATTERNS) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export type FieldKey =
  | 'series'
  | 'title'
  | 'date'
  | 'mediaType'
  | 'youtubeUrl'
  | 'video'
  | 'thumbnail'
  | 'topics'

export type Errors = Partial<Record<FieldKey, string>>

export function fileTooBig(file: File | undefined): boolean {
  return !!file && file.size > MAX_UPLOAD_BYTES
}

export function validateContents(d: MessageDraft): Errors {
  const e: Errors = {}

  if (d.category === 'series' && !d.series) {
    e.series = 'Choose the series this message belongs to, or add a new one.'
  }
  if (!d.title.trim()) e.title = 'Give this message a title.'
  if (!d.date) e.date = 'Pick the date this message was preached.'

  if (!d.mediaType) {
    e.mediaType = 'Choose where the video is: a YouTube link, or a file to upload.'
  } else if (d.mediaType === 'youtube') {
    if (!d.youtubeUrl.trim()) e.youtubeUrl = 'Paste the YouTube link for this message.'
    else if (!youtubeId(d.youtubeUrl))
      e.youtubeUrl =
        "That doesn't look like a YouTube video link. Copy it from YouTube's Share button, or from the address bar while the video is open."
  } else {
    if (!d.video?.file && !d.video?.existing) e.video = 'Add the video file.'
    else if (fileTooBig(d.video?.file))
      e.video = 'This file is over 200 MB, which the CMS can’t accept. For long recordings, upload to YouTube and paste the link instead.'

    // Series episodes may skip it (the series cover is used); Sermons can't.
    if (d.category === 'sermon' && !d.thumbnail?.file && !d.thumbnail?.existing)
      e.thumbnail = 'Add a thumbnail image — uploaded videos need one.'
    else if (fileTooBig(d.thumbnail?.file)) e.thumbnail = 'This image is over 200 MB.'
  }

  if (d.topics.length === 0) e.topics = 'Pick at least one topic.'

  return e
}

/** YYYY-MM-DD for a Date, in the editor's own timezone — a date picked as
 *  the 20th must be saved as the 20th, not shifted by UTC. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromIsoDate(iso: string): Date | undefined {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * The Date to hand the design system's DatePicker as its `value`.
 *
 * ⚠ THE "OCTOBER 3 BECOMES OCTOBER 2" BUG (Jude, 2026-09-25: "pag pinindot
 * ko yung October 3, bumabalik sa either October 2 or October 1" — both
 * wizards). @strapi/design-system 2.2.4's DatePicker is lopsided about
 * timezones, confirmed in its compiled dist/index.mjs:
 *
 *   · it READS `value` in UTC — `parseAbsolute(value.toISOString(), 'UTC')`
 *   · it WRITES onChange in the browser's zone — `date.toDate(getLocalTimeZone())`
 *
 * So onChange hands back local midnight of Oct 3 (fine — toIsoDate reads
 * local fields, so "2026-10-03" was saved correctly), but feeding that
 * same local-midnight Date back in as `value` is, in Manila (UTC+8),
 * 16:00 on Oct 2 in UTC — and the picker then shows and re-selects Oct 2.
 * Touch it again and it slips another day, which is where Oct 1 came from.
 * Invisible to anyone at UTC+0, which is why it read as random.
 *
 * The fix is to give the picker UTC midnight of the calendar date, which
 * is exactly what its UTC read expects. Only for the picker's `value`
 * (and min/max) — fromIsoDate stays local for formatting and everything else.
 */
export function toPickerDate(iso: string | null | undefined): Date | undefined {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return undefined
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/** The same UTC-midnight shape for an arbitrary local calendar day — for
 *  a DatePicker's minDate/maxDate. Defaults to today. */
export function pickerDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export function formatDate(iso: string | null | undefined): string {
  const d = iso ? fromIsoDate(iso) : undefined
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
