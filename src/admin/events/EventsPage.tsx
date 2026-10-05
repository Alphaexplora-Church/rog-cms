import { Route, Routes } from 'react-router-dom'
import EventList from './EventList'
import Wizard from './Wizard'

/**
 * The event wizard's own routes — relative, on purpose, so wherever this
 * gets mounted just works. See ../manage-contents/ManageContentsPage.tsx
 * for where it's mounted and the resulting URLs.
 *
 *   (index)       list
 *   new           wizard, Phase 1
 *   :documentId   wizard, opened on Phase 1 with the saved event
 */
export default function EventsPage() {
  return (
    <Routes>
      <Route index element={<EventList />} />
      <Route path="new" element={<Wizard />} />
      <Route path=":documentId" element={<Wizard />} />
    </Routes>
  )
}
