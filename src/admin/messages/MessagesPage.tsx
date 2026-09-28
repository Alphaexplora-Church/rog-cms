import { Route, Routes } from 'react-router-dom'
import MessageList from './MessageList'
import Wizard from './Wizard'

/**
 * The message wizard's own routes — relative, on purpose, so wherever this
 * gets mounted just works. Moved inside "Manage Contents" as "Media
 * Library" 2026-09-24 (was its own top-level sidebar entry, "Messages",
 * mounted at /admin/messages); see ../manage-contents/ManageContentsPage.tsx
 * for where it's mounted now and the resulting URLs.
 *
 *   (index)       list
 *   new           wizard, Phase 1
 *   :documentId   wizard, opened on Phase 2 with the saved message
 */
export default function MessagesPage() {
  return (
    <Routes>
      <Route index element={<MessageList />} />
      <Route path="new" element={<Wizard />} />
      <Route path=":documentId" element={<Wizard />} />
    </Routes>
  )
}
