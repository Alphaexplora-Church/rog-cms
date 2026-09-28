import type { Core } from '@strapi/strapi'
import { seedMinistries } from './api/ministry/seed'

/**
 * ── PUBLIC READ ACCESS FOR THE SERMON CONTENT MODEL, 2026-09-23 ──────────
 * rog-website-ui's Media Library is a public page — no login wall — so the
 * Public role needs `find` + `findOne` on all five content types the
 * Sermon model touches. This is set here in code rather than by hand in
 * Settings → Users & Permissions, because an earlier Alphaexplora build hit
 * a Strapi bug where the permission checkbox looked saved in the admin UI
 * but the grant silently never persisted — every request kept 403ing until
 * someone thought to check with a real unauthenticated request. Setting it
 * on boot means the grant exists in every environment the moment the
 * server starts, and this function is safe to re-run on every restart —
 * it only ever creates a permission row that doesn't already exist.
 *
 * Full UIDs rather than strings built from a short name list, so a
 * mismatch between a name and the real UID can't silently grant a
 * permission on something that doesn't exist.
 *
 * Series note (2026-09-23): Strapi needs singularName == the content-types
 * folder name AND singularName != pluralName. "series" is the same word in
 * both forms, so the plural is `sermon-series` (REST route:
 * /api/sermon-series). The UID stays `api::series.series`, and the client
 * still sees "Series" in the admin, which comes from displayName.
 */
const PUBLIC_READ_UIDS = [
  'api::speaker.speaker',
  'api::series.series',
  'api::topic.topic',
  'api::scripture.scripture',
  'api::sermon.sermon',
  'api::event.event',
  'api::ministry.ministry',
]
const PUBLIC_READ_ACTIONS = ['find', 'findOne']

async function grantPublicReadAccess(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } })

  if (!publicRole) {
    strapi.log.warn('rog-cms bootstrap: no Public role found — skipping permission grant.')
    return
  }

  for (const uid of PUBLIC_READ_UIDS) {
    for (const action of PUBLIC_READ_ACTIONS) {
      const actionId = `${uid}.${action}`

      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: actionId, role: publicRole.id } })

      if (existing) continue

      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action: actionId, role: publicRole.id },
      })

      strapi.log.info(`rog-cms bootstrap: granted Public role ${actionId}`)
    }
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadAccess(strapi)
    // Ministries (2026-09-28): fills an EMPTY collection once with the
    // website's current 20 ministries — see api/ministry/seed.ts.
    await seedMinistries(strapi)
  },
}
