import type { Core } from '@strapi/strapi'

/**
 * Adds a short public Cache-Control to anonymous GET/HEAD /api/* responses so
 * browsers / Vercel / any CDN absorb repeat reads instead of hitting Strapi +
 * Postgres (less CPU, RAM, and DB round trips). Skipped for authenticated
 * requests, non-200s, and responses that already set Cache-Control.
 */
export default (
  config: { maxAge?: number; swr?: number } = {},
  _deps: { strapi: Core.Strapi },
) => {
  const maxAge = config.maxAge ?? 60
  const swr = config.swr ?? 300
  return async (ctx: any, next: () => Promise<unknown>) => {
    await next()
    if (
      (ctx.method === 'GET' || ctx.method === 'HEAD') &&
      ctx.path.startsWith('/api/') &&
      ctx.status === 200 &&
      !ctx.get('Authorization') &&
      !ctx.response.get('Cache-Control')
    ) {
      ctx.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`)
    }
  }
}
