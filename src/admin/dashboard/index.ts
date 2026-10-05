import type { WidgetArgs } from '@strapi/strapi/admin'
import { Calendar, ChartPie, Clock, Play, WarningCircle } from '@strapi/icons'

/**
 * ROG dashboard widgets (Jude, 2026-09-30) — the homepage the client sees
 * after login, replacing Strapi's default six (Profile, Project statistics,
 * Last edited / Last published entries, Entries, …) which were about Strapi,
 * not about River of God's content.
 *
 * Order here is the order on screen. Strapi's homepage grid is 12 columns
 * and gives an odd-numbered set of widgets half width each except the last,
 * which takes the full row — so with five: two rows of two, then the library
 * snapshot across the bottom.
 *
 * Each `component` is a lazy import, so none of this loads until the
 * homepage is opened.
 */
export const ROG_WIDGETS: WidgetArgs[] = [
  {
    id: 'sunday-status',
    pluginId: 'rog',
    icon: Play,
    title: { id: 'rog.widget.sunday', defaultMessage: 'Sunday status' },
    link: { label: { id: 'rog.widget.sunday.link', defaultMessage: 'Media Library' }, href: '/manage-contents/media-library' },
    component: async () => (await import('./SundayStatus')).default,
  },
  {
    id: 'quick-actions',
    pluginId: 'rog',
    icon: Clock,
    title: { id: 'rog.widget.quick', defaultMessage: 'Quick actions' },
    component: async () => (await import('./QuickActions')).default,
  },
  {
    id: 'needs-attention',
    pluginId: 'rog',
    icon: WarningCircle,
    title: { id: 'rog.widget.attention', defaultMessage: 'Needs attention' },
    component: async () => (await import('./NeedsAttention')).default,
  },
  {
    id: 'upcoming-events',
    pluginId: 'rog',
    icon: Calendar,
    title: { id: 'rog.widget.events', defaultMessage: 'Upcoming events' },
    link: { label: { id: 'rog.widget.events.link', defaultMessage: 'All events' }, href: '/manage-contents/events' },
    component: async () => (await import('./UpcomingEvents')).default,
  },
  {
    id: 'library-snapshot',
    pluginId: 'rog',
    icon: ChartPie,
    title: { id: 'rog.widget.library', defaultMessage: 'Library snapshot' },
    component: async () => (await import('./LibrarySnapshot')).default,
  },
]

/** The uids Strapi derives from the ids above (`plugin::<pluginId>.<id>`). */
export const ROG_WIDGET_UIDS = ROG_WIDGETS.map((w) => `plugin::${w.pluginId}.${w.id}`)
