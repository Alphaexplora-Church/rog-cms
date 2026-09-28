import { Page } from '@strapi/strapi/admin'
import { Route, Routes } from 'react-router-dom'
import EventsPage from '../events/EventsPage'
import MessagesPage from '../messages/MessagesPage'
import MinistriesPage from '../ministries/MinistriesPage'
import { SectionsHub } from './SectionsHub'

/**
 * "Manage Contents" (Jude, 2026-09-24) — registered in ../app.tsx as the
 * only sidebar entry for editing site content. Everything else routes
 * through here rather than getting its own top-level menu link, so this
 * file owns the URL layout for the whole area:
 *
 *   /admin/manage-contents                     the Sections hub (SectionsHub.tsx)
 *   /admin/manage-contents/media-library        message list, formerly /admin/messages
 *   /admin/manage-contents/media-library/new    wizard, Phase 1
 *   /admin/manage-contents/media-library/:id    wizard, opened on Phase 2
 *   /admin/manage-contents/events               event list (added 2026-09-24)
 *   /admin/manage-contents/events/new           wizard, Phase 1
 *   /admin/manage-contents/events/:id           wizard, opened on Phase 1
 *   /admin/manage-contents/ministries           ministry list (added 2026-09-28)
 *   /admin/manage-contents/ministries/new       wizard, Phase 1 (Type)
 *   /admin/manage-contents/ministries/:id       wizard, opened on Phase 2
 *
 * Started life 2026-09-24 as a deliberately empty placeholder ("wag mo muna
 * lagyan ng laman or anything"); the same day Jude asked for the Sections
 * hub and for the message wizard to move inside it as "Media Library"
 * rather than sit in the sidebar on its own. Events (also 2026-09-24) is
 * the second section, following the exact same shape.
 *
 * Both MessagesPage's and EventsPage's own routes ("index" / "new" /
 * ":documentId") are relative, so mounting either at its own "<section>/*"
 * segment instead of at the admin root is a one-line change on this end —
 * nothing inside messages/ or events/ needed to know its own address
 * changed (see the relative navigate('..') calls in each Wizard.tsx and
 * list page for the other half of that).
 *
 * Each nested screen owns its own <Page.Main>/<Layouts.Header> (see
 * MessageList.tsx, Wizard.tsx, EventList.tsx) — this file only wraps the
 * hub itself.
 */
export default function ManageContentsPage() {
  return (
    <Routes>
      <Route
        index
        element={
          <Page.Main>
            <Page.Title>Manage Contents</Page.Title>
            <SectionsHub />
          </Page.Main>
        }
      />
      <Route path="media-library/*" element={<MessagesPage />} />
      <Route path="events/*" element={<EventsPage />} />
      <Route path="ministries/*" element={<MinistriesPage />} />
    </Routes>
  )
}
