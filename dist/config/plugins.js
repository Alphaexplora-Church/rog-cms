"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowedMediaTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.*',
    'text/plain',
    'text/csv',
];
const deniedTypes = [
    'image/svg+xml',
    'application/vnd.microsoft.portable-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-executable',
    'application/x-dosexec',
    'application/x-sh',
    'text/x-shellscript',
    'application/x-mach-binary',
];
/**
 * Plugin config.
 *
 * ── `cloud` DISABLED 2026-09-23 ──────────────────────────────────────────
 * `@strapi/plugin-cloud` ships in the scaffold's dependencies and adds a
 * "Deploy to Strapi Cloud" surface to the admin. ROG's CMS is deployed by
 * Alphaexplora to GCP (Doc 3 §5 — Compute Engine, Cloud SQL, Cloud Storage),
 * so that button offers the client a hosting product they are not buying, on
 * an infrastructure they are not on, and it is the single most obviously
 * "this is Strapi" element in the panel.
 *
 * Disabling is the supported way to remove it. The package stays in
 * `package.json` deliberately — uninstalling it would be a second thing to
 * remember when regenerating this repo from the template, and a disabled
 * plugin costs nothing at runtime.
 *
 * `src/admin/app.tsx` also hides any stray `strapi.cloud` links through CSS,
 * as a belt-and-braces for promo surfaces this flag does not reach. That CSS
 * deliberately excludes the sidebar's Marketplace link, which is a real
 * feature — see the warning in that file.
 */
/**
 * ── UPLOAD PROVIDER, PRE-PROD DEPLOY 2026-09-28 ──────────────────────────
 * Render's disk is ephemeral — anything written to `public/uploads` by the
 * default local provider disappears on the next redeploy or restart. Media
 * now goes to Supabase Storage instead, over its S3-compatible endpoint,
 * using Strapi's standard `@strapi/provider-upload-aws-s3` (no Supabase-
 * specific package needed — Supabase Storage just speaks the S3 API).
 *
 * `S3_ENDPOINT` is the project's S3 endpoint from Supabase → Storage → S3
 * Access Keys (`https://<project-ref>.supabase.co/storage/v1/s3`).
 * `s3ForcePathStyle: true` is required — Supabase's S3 gateway is
 * path-style (`endpoint/bucket/key`), not the virtual-hosted-style AWS
 * defaults to. Falls back to the untouched local provider when
 * `S3_ENDPOINT` isn't set (plain local/dev, no env vars needed there).
 */
const s3Enabled = process.env.S3_ENDPOINT;
const config = ({ env }) => ({
    cloud: {
        enabled: false,
    },
    'users-permissions': {
        config: {
            jwtManagement: 'refresh',
            sessions: {
                httpOnly: true,
            },
        },
    },
    upload: {
        config: {
            ...(s3Enabled
                ? {
                    provider: 'aws-s3',
                    providerOptions: {
                        /**
                         * Supabase's S3-compatible endpoint (`/storage/v1/s3`) is for
                         * the upload protocol only. Public read URLs live on a
                         * different path (`/storage/v1/object/public/<bucket>`), so
                         * the provider's default URL-building (which just reuses the
                         * S3 endpoint) produces a broken link. `baseUrl` overrides
                         * that and is what actually gets used for every asset's URL.
                         */
                        baseUrl: `${env('S3_ENDPOINT', '').replace('/storage/v1/s3', '/storage/v1/object/public')}/${env('S3_BUCKET')}`,
                        s3Options: {
                            endpoint: env('S3_ENDPOINT'),
                            region: env('S3_REGION', 'us-east-1'),
                            credentials: {
                                accessKeyId: env('S3_ACCESS_KEY_ID'),
                                secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
                            },
                            forcePathStyle: true,
                            params: {
                                Bucket: env('S3_BUCKET'),
                            },
                        },
                    },
                }
                : {}),
            security: {
                allowedTypes: allowedMediaTypes,
                deniedTypes,
            },
        },
    },
});
exports.default = config;
