import { Route, Routes } from 'react-router-dom'
import MinistryList from './MinistryList'
import Wizard from './Wizard'

/**
 * The Ministries wizard's own routes — relative, like EventsPage.tsx, so
 * wherever this is mounted just works. Mounted at
 * /admin/manage-contents/ministries (see ../manage-contents/ManageContentsPage.tsx).
 *
 *   (index)       list
 *   new           wizard, Phase 1 (Type)
 *   :documentId   wizard, opened on Phase 2 with the saved ministry
 */
export default function MinistriesPage() {
  return (
    <Routes>
      <Route index element={<MinistryList />} />
      <Route path="new" element={<Wizard />} />
      <Route path=":documentId" element={<Wizard />} />
    </Routes>
  )
}
