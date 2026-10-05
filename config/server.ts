import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Behind Render's load balancer: trust X-Forwarded-* so ctx.request.ip is the
  // real visitor (rate limiting) and secure cookies work. PUBLIC_URL = the CMS's own https URL.
  proxy: { koa: true },
  ...(env('PUBLIC_URL') ? { url: env('PUBLIC_URL') } : {}),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
