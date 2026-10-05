import type { Core } from '@strapi/strapi'

/**
 * Basic per-IP rate limiter for public endpoints (2026-10-05).
 *
 * In-memory: resets on restart and is per instance, which is fine for one
 * Render instance. Move the counter to Redis if the CMS ever runs on several.
 * Needs `proxy: { koa: true }` in config/server.ts, otherwise ctx.request.ip is
 * the load balancer and every visitor shares one bucket.
 *
 * Add a rule here when a new public write endpoint is created (signups,
 * prayer requests, plan-a-visit...). Admin and upload routes are not limited.
 */
type Rule = { name: string; methods: string[]; path: RegExp; max: number; windowMs: number }

const DEFAULT_RULES: Rule[] = [
  // Public write endpoints (future forms)
  { name: 'forms', methods: ['POST'], path: /^\/api\/(signups?|prayer-requests?|visits?)/, max: 5, windowMs: 10 * 60_000 },
  // Login brute-force
  { name: 'auth', methods: ['POST'], path: /^\/(admin\/login|api\/auth\/local)/, max: 10, windowMs: 15 * 60_000 },
  // Generic public reads (does not touch /admin, /content-manager or /upload)
  { name: 'reads', methods: ['GET'], path: /^\/api\//, max: 300, windowMs: 60_000 },
]

const hits = new Map<string, { count: number; reset: number }>()

export default (config: { rules?: Rule[] } = {}, { strapi }: { strapi: Core.Strapi }) => {
  const rules = config.rules ?? DEFAULT_RULES

  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  }, 60_000).unref()

  return async (ctx: any, next: () => Promise<void>) => {
    const rule = rules.find((r) => r.methods.includes(ctx.method) && r.path.test(ctx.path))
    if (!rule) return next()

    const key = `${rule.name}:${ctx.request.ip}`
    const now = Date.now()
    const e = hits.get(key)
    const entry = !e || e.reset <= now ? { count: 0, reset: now + rule.windowMs } : e
    entry.count += 1
    hits.set(key, entry)

    if (entry.count > rule.max) {
      ctx.status = 429
      ctx.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)))
      ctx.body = {
        data: null,
        error: { status: 429, name: 'TooManyRequestsError', message: 'Too many requests. Please try again later.' },
      }
      strapi.log.warn(`rate-limit: ${rule.name} blocked ${ctx.request.ip}`)
      return
    }
    return next()
  }
}
