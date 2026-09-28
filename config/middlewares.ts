import type { Core } from '@strapi/strapi'

/**
 * ── FAVICON, 2026-09-23 ──────────────────────────────────────────────────
 * The browser-tab icon is a SEPARATE mechanism from everything in
 * `src/admin/app.tsx`. The theme config cannot set it; this middleware can.
 *
 * `'strapi::favicon'` as a bare string serves Strapi's own icon. Turning it
 * into a configured object points it at a file at the project root instead —
 * here, the same wave mark the River of God site uses for its own tab, so a
 * client with both open sees one brand rather than a church site next to a
 * Strapi tab.
 *
 * `src/admin/app.tsx` additionally sets `config.head.favicon`, which covers
 * the admin single-page app after it boots. Both are needed: this middleware
 * answers the initial `/favicon.ico` request, the admin config governs the
 * tab once React has taken over.
 *
 * ── X-POWERED-BY, same date ──────────────────────────────────────────────
 * `'strapi::poweredBy'` bare sends `X-Powered-By: Strapi <strapi.io>` on
 * every response. It is the one place the white-label leaks outside the UI —
 * invisible to the client in normal use, but the first thing anyone auditing
 * the site or reading response headers would see. Renamed rather than
 * removed, since dropping the middleware entirely changes the header set
 * rather than its value.
 *
 * ── SECURITY (CSP), 2026-09-24 ───────────────────────────────────────────
 * The Messages wizard previews a pasted YouTube link with YouTube's own
 * thumbnail, which is served from i.ytimg.com. Strapi's default Content
 * Security Policy only allows admin images from its own origin, data:,
 * blob: and Strapi's marketplace, so that one image host is added. Images
 * only — no scripts, frames or other hosts are opened up. The first four
 * entries are Strapi's own defaults, restated because this list replaces
 * the default rather than adding to it.
 *
 * `https://*.supabase.co` was added the same way on 2026-09-28: once media
 * uploads move to Supabase Storage (see `config/plugins.ts`), the admin's
 * Media Library thumbnails are images served from that host, not Strapi's
 * own origin, so the default img-src would silently block them.
 *
 * ── CORS, PRE-PROD DEPLOY 2026-09-28 ─────────────────────────────────────
 * `'strapi::cors'` as a bare string uses Strapi's default origin list,
 * which only allows the dev host (localhost:8000/1337) — the Vercel-hosted
 * frontend gets a plain CORS rejection against that. `FRONTEND_URL` is set
 * per environment (Render dashboard → Environment) to the deployed Vercel
 * URL; local dev keeps working via the two Vite ports without needing that
 * var set at all. A comma-separated `FRONTEND_URL` (e.g. the production
 * domain plus a Vercel preview URL) is supported for QA on more than one
 * deployed origin at a time.
 */
const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://market-assets.strapi.io',
            'https://i.ytimg.com',
            'https://*.supabase.co',
          ],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
      ],
    },
  },
  { name: 'strapi::poweredBy', config: { poweredBy: 'River of God - Alphaexplora Core' } },
  'strapi::query',
  'strapi::body',
  'strapi::session',
  { name: 'strapi::favicon', config: { path: 'favicon.png' } },
  'strapi::public',
]

export default config
