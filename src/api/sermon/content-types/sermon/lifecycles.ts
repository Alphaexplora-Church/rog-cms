// `@strapi/utils` is pinned to Strapi's own version in package.json. If a
// second, newer copy gets installed alongside, this ApplicationError is no
// longer the class Strapi's error handler recognises, and every rule below
// reaches the editor as a bare "Internal Server Error" (found 2026-09-24:
// a stray 5.54 copy did exactly that).
import { errors } from '@strapi/utils'

const { ApplicationError } = errors

/**
 * Sermon lifecycle.
 *
 * `schema.json` can only mark a field as always-required. The rules below
 * depend on what the editor picked in another field, so they live here.
 *
 * ── Category (added 2026-09-23, agreed with Jude) ────────────────────────
 * Two categories, and only two:
 *   'series' → the message belongs to a named series (I AM, Exodus,
 *              Ecclesiastes...). A series MUST be picked. Editors pick or
 *              create it in the Messages wizard (src/admin/messages/).
 *   'sermon' → a Sunday or Midweek message. Those two used to be separate
 *              service types; Jude merged them into this one category.
 *              No series is needed.
 *
 * ── Media type ───────────────────────────────────────────────────────────
 *   'youtube' → `youtubeUrl` required. Parsed into an 11-character video id
 *               stored in `youtubeVideoId`. The frontend builds the
 *               thumbnail and embed from that id
 *               (rog-website-ui/src/shared/lib/youtube.ts).
 *   'upload'  → `videoFile` required. `thumbnail` required for the Sermons
 *               category, since there is no platform to pull one from.
 *               OPTIONAL for Series episodes (Jude, 2026-09-24): with no
 *               thumbnail the website shows the series' cover image.
 *
 * Scripture is optional by decision (2026-09-23): most ROG messages are
 * topical, and a required field would push editors into tagging a book
 * that isn't really the basis of the message.
 *
 * Speaker is optional too (Jude, 2026-09-23: "kapag walang speaker, wag mo
 * na lagyan"). Several real series episodes on riverofgod.ph credit no one;
 * the website simply shows no speaker for those.
 *
 * Errors are thrown as Strapi's ApplicationError so the admin shows the
 * message to the editor. A plain `Error` surfaces as a generic
 * "Internal Server Error", which tells the client nothing.
 *
 * ── Tested ───────────────────────────────────────────────────────────────
 * Against a running Strapi 5.53, 2026-09-23 and 2026-09-24, through both
 * the Document Service and the admin HTTP API the Messages wizard uses.
 * Over HTTP the messages only reach the editor when `@strapi/utils` is the
 * SAME copy Strapi's core uses — see the note on the import at the top.
 */

const YOUTUBE_URL_PATTERNS = [
  // youtube.com/watch?v=ID  (tolerates extra params, e.g. &t=45s)
  /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  // youtu.be/ID  (what the mobile Share button copies)
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  // youtube.com/embed/ID
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  // youtube.com/shorts/ID
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  // youtube.com/live/ID  (the URL a livestream gets — Sunday/Midweek services)
  /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
]

function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Whether a relation payload links to something.
 *
 * Returns true/false when the payload itself decides it, or undefined when
 * the payload doesn't touch the link (e.g. `{ connect: [], disconnect: [] }`),
 * meaning "whatever is already saved still applies".
 *
 * Strapi 5 sends relations in several shapes depending on the caller: a bare
 * id or documentId, an object with an id, an array, or
 * `{ connect, disconnect, set }`. All are handled.
 */
function relationIsLinked(value: unknown): boolean | undefined {
  if (value === null) return false
  if (value === undefined) return undefined
  if (typeof value === 'number' || typeof value === 'string') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (Array.isArray(v.set)) return v.set.length > 0
    if (Array.isArray(v.connect) && v.connect.length > 0) return true
    if (Array.isArray(v.disconnect) && v.disconnect.length > 0) return false
    if ('id' in v || 'documentId' in v) return true
    return undefined
  }
  return undefined
}

async function validate(event: any) {
  const { data, where } = event.params
  if (!data) return

  // On update Strapi only sends the fields that changed. Anything missing
  // from this request falls back to what's already saved, so editing just
  // the title doesn't trip a rule about a field that is already filled in.
  const existing =
    where?.id != null
      ? await strapi.db.query('api::sermon.sermon').findOne({
          where: { id: where.id },
          populate: ['series', 'videoFile', 'thumbnail'],
        })
      : null

  const readField = (key: string) => (key in data ? data[key] : existing?.[key])

  /* ── Category ─────────────────────────────────────────────────────────── */
  const category = readField('category') ?? 'sermon'

  if (category === 'series') {
    const linked =
      'series' in data ? relationIsLinked(data.series) : undefined
    const hasSeries = linked ?? existing?.series != null

    if (!hasSeries) {
      throw new ApplicationError(
        'Please choose a Series for this message — pick an existing one, or create a new one from the Series field.'
      )
    }
  }

  /* ── Media type ───────────────────────────────────────────────────────── */
  const mediaType = readField('mediaType') ?? 'youtube'

  if (mediaType === 'youtube') {
    const youtubeUrl = readField('youtubeUrl')
    if (!youtubeUrl) {
      throw new ApplicationError('Please paste the YouTube link for this message.')
    }
    const videoId = extractYouTubeId(String(youtubeUrl))
    if (!videoId) {
      throw new ApplicationError(
        "That doesn't look like a YouTube video link. Copy the link from YouTube's Share button, or from the address bar while the video is open."
      )
    }
    data.youtubeVideoId = videoId
  } else if (mediaType === 'upload') {
    if (!readField('videoFile')) {
      throw new ApplicationError('Please upload the video file for this message.')
    }
    // Series episodes may skip the thumbnail — the website shows the
    // series' cover image instead (Jude, 2026-09-24). A Sermons-category
    // upload has no series to borrow from, so it still needs its own.
    if (category !== 'series' && !readField('thumbnail')) {
      throw new ApplicationError(
        'Please upload a thumbnail image. Uploaded videos need one, because unlike YouTube there is nowhere to pull it from automatically.'
      )
    }
    data.youtubeVideoId = null
  }
}

export default {
  async beforeCreate(event: any) {
    await validate(event)
  },
  async beforeUpdate(event: any) {
    await validate(event)
  },
}
