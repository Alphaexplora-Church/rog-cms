import {
  Badge,
  Box,
  Button,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Searchbar,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system'
import { ChevronLeft, ChevronRight, Pencil, Plus } from '@strapi/icons'
import { Layouts, Page, useFetchClient } from '@strapi/strapi/admin'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeleteButton } from '../manage-contents/DeleteButton'
import { TYPE_LABEL, deleteMinistry, errorMessage, listMinistries, type MinistryRow, type MinistryType } from './api'

/**
 * Ministries — the wizard's home, same table pattern as EventList.tsx and
 * the Media Library's MessageList.tsx. Listed in website order (oldest
 * first), with a Type filter so the three sections can be looked at one at
 * a time, "New Ministry" to start the wizard, and a row click to edit.
 */

const STATUS: Record<MinistryRow['status'], { label: string; tone: 'success' | 'secondary' | 'warning' }> = {
  published: { label: 'Live', tone: 'success' },
  modified: { label: 'Live · unpublished edits', tone: 'warning' },
  draft: { label: 'Draft', tone: 'secondary' },
}

const TYPE_TONE: Record<MinistryType, 'primary' | 'secondary' | 'alternative'> = {
  ages: 'primary',
  service: 'secondary',
  body: 'alternative',
}

export default function MinistryList() {
  const client = useFetchClient()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState<MinistryType | 'all'>('all')
  const [rows, setRows] = useState<MinistryRow[]>([])
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(query)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(undefined)
    listMinistries(client, { page, query: search, type })
      .then((r) => {
        if (!live) return
        setRows(r.rows)
        setPageCount(r.pageCount)
        setTotal(r.total)
      })
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, type, attempt])

  const open = (documentId: string) => navigate(documentId)

  // After a delete: step back a page if that was the last row on it,
  // otherwise just reload the current page.
  const remove = async (documentId: string) => {
    await deleteMinistry(client, documentId)
    if (rows.length === 1 && page > 1) setPage((p) => p - 1)
    else setAttempt((a) => a + 1)
  }
  const filtered = !!search || type !== 'all'

  return (
    <Page.Main>
      <Page.Title>Ministries</Page.Title>
      <Layouts.Header
        title="Ministries"
        subtitle="Ages of the River, Service Ministries and Body of Christ Ministries on the website’s Ministries page."
        primaryAction={
          <Button size="L" startIcon={<Plus />} onClick={() => navigate('new')}>
            New Ministry
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Flex gap={3} wrap="wrap" alignItems="flex-end">
            <Box style={{ flex: '1 1 320px', maxWidth: 420 }}>
              <Searchbar
                name="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery('')}
                clearLabel="Clear search"
                placeholder="Search by name…"
              >
                Search ministries
              </Searchbar>
            </Box>
            <Box style={{ width: 260 }}>
              <SingleSelect
                aria-label="Filter by type"
                value={type}
                onChange={(v: string | number) => {
                  setType(v as MinistryType | 'all')
                  setPage(1)
                }}
              >
                <SingleSelectOption value="all">All types</SingleSelectOption>
                <SingleSelectOption value="ages">{TYPE_LABEL.ages}</SingleSelectOption>
                <SingleSelectOption value="service">{TYPE_LABEL.service}</SingleSelectOption>
                <SingleSelectOption value="body">{TYPE_LABEL.body}</SingleSelectOption>
              </SingleSelect>
            </Box>
          </Flex>

          {error ? (
            <Box background="neutral0" hasRadius shadow="tableShadow" padding={8}>
              <Flex direction="column" gap={4}>
                <Typography textColor="danger600">{error}</Typography>
                <Button variant="secondary" onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </Button>
              </Flex>
            </Box>
          ) : loading && rows.length === 0 ? (
            <Flex justifyContent="center" padding={10}>
              <Loader>Loading ministries…</Loader>
            </Flex>
          ) : rows.length === 0 ? (
            <Box background="neutral0" hasRadius shadow="tableShadow">
              <EmptyStateLayout
                content={filtered ? 'No ministries match this search or type.' : 'No ministries yet. Your first one takes about a minute.'}
                action={
                  filtered ? undefined : (
                    <Button startIcon={<Plus />} onClick={() => navigate('new')}>
                      New Ministry
                    </Button>
                  )
                }
              />
            </Box>
          ) : (
            <>
              <Table className="rog-list rog-list-ministries" colCount={5} rowCount={rows.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Name</Typography></Th>
                    <Th><Typography variant="sigma">Type</Typography></Th>
                    <Th><Typography variant="sigma">Details</Typography></Th>
                    <Th><Typography variant="sigma">Status</Typography></Th>
                    <Th><Typography variant="sigma" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>Actions</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Tr key={r.documentId} onClick={() => open(r.documentId)} style={{ cursor: 'pointer' }}>
                      <Td style={{ maxWidth: 360 }}>
                        <Typography className="rog-cell-title" fontWeight="semiBold" ellipsis style={{ maxWidth: 340 }}>
                          {r.name}
                        </Typography>
                        <Typography className="rog-show-sm" variant="pi" textColor="neutral600">
                          {TYPE_LABEL[r.ministryType]}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge backgroundColor={`${TYPE_TONE[r.ministryType]}100`} textColor={`${TYPE_TONE[r.ministryType]}700`}>
                          {TYPE_LABEL[r.ministryType]}
                        </Badge>
                      </Td>
                      <Td style={{ maxWidth: 300 }}>
                        <Typography textColor={r.detail ? 'neutral800' : 'neutral500'} ellipsis style={{ maxWidth: 280 }}>
                          {r.detail || '—'}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge backgroundColor={`${STATUS[r.status].tone}100`} textColor={`${STATUS[r.status].tone}700`}>
                          {STATUS[r.status].label}
                        </Badge>
                      </Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <Flex gap={1} justifyContent="flex-end">
                          <IconButton label={`Edit ${r.name}`} variant="ghost" onClick={() => open(r.documentId)}>
                            <Pencil />
                          </IconButton>
                          <DeleteButton
                            name={r.name}
                            kind="ministry"
                            onDelete={() => remove(r.documentId)}
                            describeError={errorMessage}
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi" textColor="neutral600">
                  {total === 1 ? '1 ministry' : `${total} ministries`}
                </Typography>
                {pageCount > 1 ? (
                  <Flex gap={2} alignItems="center">
                    <IconButton label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft />
                    </IconButton>
                    <Typography variant="pi" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {`Page ${page} of ${pageCount}`}
                    </Typography>
                    <IconButton label="Next page" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight />
                    </IconButton>
                  </Flex>
                ) : null}
              </Flex>
            </>
          )}
        </Flex>
      </Layouts.Content>
    </Page.Main>
  )
}
