"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seed_1 = require("./api/ministry/seed");
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
];
const PUBLIC_READ_ACTIONS = ['find', 'findOne'];
async function grantPublicReadAccess(strapi) {
    const publicRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });
    if (!publicRole) {
        strapi.log.warn('rog-cms bootstrap: no Public role found — skipping permission grant.');
        return;
    }
    for (const uid of PUBLIC_READ_UIDS) {
        for (const action of PUBLIC_READ_ACTIONS) {
            const actionId = `${uid}.${action}`;
            const existing = await strapi.db
                .query('plugin::users-permissions.permission')
                .findOne({ where: { action: actionId, role: publicRole.id } });
            if (existing)
                continue;
            await strapi.db.query('plugin::users-permissions.permission').create({
                data: { action: actionId, role: publicRole.id },
            });
            strapi.log.info(`rog-cms bootstrap: granted Public role ${actionId}`);
        }
    }
}
/**
 * ── REPAIR OLD SUPABASE IMAGE LINKS, 2026-09-29 ──────────────────────────
 * Files uploaded before `baseUrl` was added to config/plugins.ts were saved
 * with a link Supabase doesn't serve (`https://<project>.supabase.co/<bucket>/<file>`,
 * or the same under `/storage/v1/s3/`). The picture really is in the bucket,
 * but the website gets a 404, so it shows nothing. The link that works is
 * `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<file>`.
 *
 * The upload config only affects NEW uploads, so this rewrites the saved
 * link (and every resized copy in `formats`) of any old file on boot. Safe
 * to run every restart: a file that already has the right link is skipped.
 * Does nothing when S3 isn't configured (plain local/dev).
 */
async function repairSupabaseFileUrls(strapi) {
    var _a, _b;
    const endpoint = ((_a = process.env.S3_ENDPOINT) !== null && _a !== void 0 ? _a : '').replace(/\/+$/, '');
    const bucket = (_b = process.env.S3_BUCKET) !== null && _b !== void 0 ? _b : '';
    if (!endpoint || !bucket || !endpoint.includes('/storage/v1/s3'))
        return;
    const host = endpoint.replace('/storage/v1/s3', '');
    const good = `${host}/storage/v1/object/public/${bucket}/`;
    const bad = [`${endpoint}/${bucket}/`, `${host}/${bucket}/`];
    const fix = (url) => {
        if (typeof url !== 'string')
            return url;
        const prefix = bad.find((b) => url.startsWith(b));
        return prefix ? good + url.slice(prefix.length) : url;
    };
    // One-time: skip the full-table scan on every boot once it has run for this
    // exact URL prefix. Delete the store key to force a re-run.
    const store = strapi.store({ type: 'core', name: 'rog-cms' });
    const KEY = 'supabase-url-repair-done';
    if ((await store.get({ key: KEY })) === good)
        return;
    const files = await strapi.db.query('plugin::upload.file').findMany({
        where: { url: { $startsWith: host } },
        select: ['id', 'url', 'formats'],
    });
    let repaired = 0;
    for (const file of files) {
        const url = fix(file.url);
        let formats = file.formats;
        let formatsChanged = false;
        if (formats && typeof formats === 'object') {
            formats = Object.fromEntries(Object.entries(formats).map(([k, f]) => {
                const next = fix(f === null || f === void 0 ? void 0 : f.url);
                if (next !== (f === null || f === void 0 ? void 0 : f.url))
                    formatsChanged = true;
                return [k, { ...f, url: next }];
            }));
        }
        if (url === file.url && !formatsChanged)
            continue;
        await strapi.db.query('plugin::upload.file').update({
            where: { id: file.id },
            data: { url, formats },
        });
        repaired += 1;
    }
    if (repaired)
        strapi.log.info(`rog-cms bootstrap: repaired ${repaired} Supabase image link(s).`);
    await store.set({ key: KEY, value: good });
}
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register( /* { strapi }: { strapi: Core.Strapi } */) { },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    async bootstrap({ strapi }) {
        await grantPublicReadAccess(strapi);
        await repairSupabaseFileUrls(strapi);
        // Ministries (2026-09-28): fills an EMPTY collection once with the
        // website's current 20 ministries — see api/ministry/seed.ts.
        await (0, seed_1.seedMinistries)(strapi);
    },
};
