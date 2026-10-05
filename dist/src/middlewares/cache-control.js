"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Adds a short public Cache-Control to anonymous GET/HEAD /api/* responses so
 * browsers / Vercel / any CDN absorb repeat reads instead of hitting Strapi +
 * Postgres (less CPU, RAM, and DB round trips). Skipped for authenticated
 * requests, non-200s, and responses that already set Cache-Control.
 */
exports.default = (config = {}, _deps) => {
    var _a, _b;
    const maxAge = (_a = config.maxAge) !== null && _a !== void 0 ? _a : 60;
    const swr = (_b = config.swr) !== null && _b !== void 0 ? _b : 300;
    return async (ctx, next) => {
        await next();
        if ((ctx.method === 'GET' || ctx.method === 'HEAD') &&
            ctx.path.startsWith('/api/') &&
            ctx.status === 200 &&
            !ctx.get('Authorization') &&
            !ctx.response.get('Cache-Control')) {
            ctx.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
        }
    };
};
