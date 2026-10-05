import { FIELDS_BY_TYPE, MAX_UPLOAD_BYTES, nameLabel, type Field, type MinistryDraft } from './api'

/**
 * The Ministries wizard's own validation, so the editor hears about a
 * problem on the field itself before pressing Next — not from a server
 * error at the very end. Only the chosen type's fields are checked.
 *
 * Required = what the website needs so the ministry never shows broken:
 *   every type   → name/title and description
 *   ages         → the age range too (it is the panel's giant numeral)
 *   service      → contact name and number too ("To join, contact …")
 * Quote, hashtags, subtitle and the cover photo are optional — a ministry
 * without a photo shows the site's textured placeholder ground.
 */

export type Errors = Partial<Record<Field | 'ministryType', string>>

export function validateType(d: MinistryDraft): Errors {
  return d.ministryType ? {} : { ministryType: 'Choose what kind of ministry this is.' }
}

/** A phone number: digits with the usual separators, 7–15 digits. */
export function looksLikePhone(v: string): boolean {
  if (!/^[+\d\s()-]+$/.test(v)) return false
  const digits = v.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15
}

export function validateDetails(d: MinistryDraft): Errors {
  const e: Errors = {}
  if (!d.ministryType) return validateType(d)
  const fields = FIELDS_BY_TYPE[d.ministryType]

  if (!d.name.trim()) e.name = d.ministryType === 'body' ? 'Give this ministry a title.' : 'Give this ministry a name.'
  if (!d.description.trim()) e.description = 'Add a short description.'

  if (fields.includes('ages') && !d.ages.trim()) e.ages = 'Add the age range, e.g. 3–12.'

  if (fields.includes('contactName') && !d.contactName.trim()) e.contactName = 'Who should volunteers contact?'
  if (fields.includes('contactNumber')) {
    if (!d.contactNumber.trim()) e.contactNumber = 'Add their contact number.'
    else if (!looksLikePhone(d.contactNumber.trim())) e.contactNumber = 'That doesn’t look like a phone number.'
  }

  const f = d.coverPhoto?.file
  if (f && f.size > MAX_UPLOAD_BYTES) e.coverPhoto = 'This image is over 200 MB.'

  return e
}

export { nameLabel }
