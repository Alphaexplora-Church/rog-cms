"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_RULES = [
    // Public write endpoints (future forms)
    { name: 'forms', methods: ['POST'], path: /^\/api\/(signups?|prayer-requests?|visits?)/, max: 5, windowMs: 10 * 60000 },
    // Login brute-force
    { name: 'auth', methods: ['POST'], path: /^\/(admin\/login|api\/auth\/local)/, max: 10, windowMs: 15 * 60000 },
    // Generic public reads (does not touch /admin, /content-manager or /upload)
    { name: 'reads', methods: ['GET'], path: /^\/api\//, max: 300, windowMs: 60000 },
];
const hits = new Map();
exports.default = (config = {}, { strapi }) => {
    var _a;
    const rules = (_a = config.rules) !== null && _a !== void 0 ? _a : DEFAULT_RULES;
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits)
            if (v.reset <= now)
                hits.delete(k);
    }, 60000).unref();
    return async (ctx, next) => {
        const rule = rules.find((r) => r.methods.includes(ctx.method) && r.path.test(ctx.path));
        if (!rule)
            return next();
        const key = `${rule.name}:${ctx.request.ip}`;
        const now = Date.now();
        const e = hits.get(key);
        const entry = !e || e.reset <= now ? { count: 0, reset: now + rule.windowMs } : e;
        entry.count += 1;
        hits.set(key, entry);
        if (entry.count > rule.max) {
            ctx.status = 429;
            ctx.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
            ctx.body = {
                data: null,
                error: { status: 429, name: 'TooManyRequestsError', message: 'Too many requests. Please try again later.' },
            };
            strapi.log.warn(`rate-limit: ${rule.name} blocked ${ctx.request.ip}`);
            return;
        }
        return next();
    };
};
