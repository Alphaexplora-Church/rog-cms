import type { Core } from '@strapi/strapi'

/**
 * Admin server config.
 *
 * ── THE FLAGS BLOCK, 2026-09-23 ──────────────────────────────────────────
 * Jude: "remove all the unecessary things na hindi naman kailangan makita ni
 * client or gagamitin ni client ng cms."
 *
 * All three shipped as `true` in the Strapi scaffold, and all three put
 * Strapi's own product in front of a client who is only here to edit church
 * content. They are officially supported switches, not CSS hacks — which is
 * why they belong here rather than in `src/admin/app.tsx`.
 *
 *   nps        Strapi's satisfaction survey. It periodically interrupts the
 *              admin to ask how likely they are to recommend *Strapi* — a
 *              product they were never told they were using.
 *   promoteEE  Enterprise Edition upsells, scattered through Settings. ROG
 *              cannot buy an EE licence; Alphaexplora owns that decision.
 *   docLinks   Links out to Strapi's documentation. They lead somewhere that
 *              looks nothing like this panel and describes features the
 *              client's role cannot reach, which reads as a broken link even
 *              though it works.
 *
 * Each is still env-overridable, so any of them can be switched back on for
 * a debugging session without editing code:
 *   FLAG_NPS=true npm run develop
 *
 * Two more switches live in `src/admin/app.tsx` because they are admin-app
 * config rather than server flags: `tutorials` (the "get started" video) and
 * `notifications.releases` (the new-version banner).
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  flags: {
    nps: env.bool('FLAG_NPS', false),
    promoteEE: env.bool('FLAG_PROMOTE_EE', false),
    docLinks: env.bool('FLAG_DOC_LINKS', false),
  },
})

export default config
