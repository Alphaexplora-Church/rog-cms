import { MAX_UPLOAD_BYTES, type EventDraft } from './api'

/**
 * The event wizard's own copy of the validation rules, so the editor hears
 * about a problem on the field itself, before pressing Next — instead of
 * from a server error at the very end.
 *
 * toIsoDate/fromIsoDate/formatDate are shared with the Media Library
 * wizard (../messages/rules.ts) — they're generic Date↔ISO helpers, not
 * message-specific, so there's one copy rather than two that could drift.
 */
export { toIsoDate, fromIsoDate, formatDate, toPickerDate, pickerDay } from '../messages/rules'

export type FieldKey =
  | 'eventName'
  | 'eventDate'
  | 'eventTime'
  | 'eventLocation'
  | 'eventDescription'
  | 'headerPhoto'

export type Errors = Partial<Record<FieldKey, string>>

export function fileTooBig(file: File | undefined): boolean {
  return !!file && file.size > MAX_UPLOAD_BYTES
}

export function validateContents(d: EventDraft): Errors {
  const e: Errors = {}

  if (!d.eventName.trim()) e.eventName = 'Give this event a name.'
  if (!d.eventDate) e.eventDate = 'Pick the date this event happens.'
  if (!d.eventTime) e.eventTime = 'Pick the time this event starts.'
  if (!d.eventLocation.trim()) e.eventLocation = 'Say where this event is happening.'
  if (!d.eventDescription.trim()) e.eventDescription = 'Add a short description of the event.'

  if (!d.headerPhoto?.file && !d.headerPhoto?.existing) e.headerPhoto = 'Add a header photo.'
  else if (fileTooBig(d.headerPhoto?.file)) e.headerPhoto = 'This image is over 200 MB.'

  return e
}

/**
 * Strapi's native "time" field stores HH:mm:ss.SSS. The design system's
 * TimePicker (replaced by the wheel-style TimeWheel on 2026-09-25, which
 * keeps the same "HH:mm" value shape), in this version (@strapi/design-system 2.2.4 — checked
 * against its compiled dist/index.mjs, 2026-09-24), works in a plain
 * "HH:mm" string for its own value/onChange — it formats via
 * Intl.DateTimeFormat with hour12:false, which yields no seconds. These two
 * convert between the two shapes at the read/write boundary, the same way
 * toIsoDate/fromIsoDate do for the DatePicker.
 *
 * Confirmed against a running Strapi 5.53 (disposable test instance,
 * 2026-09-24): "HH:mm" alone is rejected ("Invalid time format, expected
 * HH:mm:ss.SSS"); "HH:mm:ss" and "HH:mm:ss.SSS" are both accepted and
 * stored back as "HH:mm:ss.SSS".
 */
export function toIsoTime(hhmm: string): string {
  return hhmm ? `${hhmm}:00.000` : ''
}

export function fromIsoTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 5)
}

export function formatTime(iso: string | null | undefined): string {
  const hhmm = fromIsoTime(iso)
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
