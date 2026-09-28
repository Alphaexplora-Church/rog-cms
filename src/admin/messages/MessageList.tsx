import {
  Badge,
  Box,
  Button,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Searchbar,
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
import { errorMessage, listMessages, type MessageRow } from './api'
import { formatDate } from './rules'

/**
 * Media Library — the wizard's home (renamed from "Messages" and moved
 * inside Manage Contents, Jude 2026-09-24; see MessagesPage.tsx for the new
 * URL layout). Every sermon and series episode, newest first, with "New
 * Media" to start the wizard and a row click to edit. The button label
 * changed to "New Media" the same day, matching the section's own rename;
 * the code underneath — variables, comments elsewhere in this file, the
 * api.ts calls — still says "message"/"messages", since only what the
 * client actually reads changed.
 *
 * Every navigate() below is relative (no leading slash), so this doesn't
 * care what it's mounted under.
 */

const STATUS: Record<MessageRow['status'], { label: string; tone: 'success' | 'secondary' | 'warning' }> = {
  published: { label: 'Live', tone: 'success' },
  modified: { label: 'Live · unpublished edits', tone: 'warning' },
  draft: { label: 'Draft', tone: 'secondary' },
}

export default function MessageList() {
  const client = useFetchClient()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<MessageRow[]>([])
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [attempt, setAttempt] = useState(0)

  // Search waits for a pause in typing rather than firing on every key.
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
    listMessages(client, { page, query: search })
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
  }, [page, search, attempt])

  const open = (documentId: string) => navigate(documentId)

  return (
    <Page.Main>
      <Page.Title>Media Library</Page.Title>
      <Layouts.Header
        title="Media Library"
        subtitle="Sermons and series episodes on the website’s Media page."
        primaryAction={
          <Button size="L" startIcon={<Plus />} onClick={() => navigate('new')}>
            New Media
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Box style={{ maxWidth: 420 }}>
            <Searchbar
              name="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              clearLabel="Clear search"
              placeholder="Search by title…"
            >
              Search messages
            </Searchbar>
          </Box>

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
              <Loader>Loading messages…</Loader>
            </Flex>
          ) : rows.length === 0 ? (
            <Box background="neutral0" hasRadius shadow="tableShadow">
              <EmptyStateLayout
                content={search ? `No messages match “${search}”.` : 'No messages yet. Your first one takes about a minute.'}
                action={
                  search ? undefined : (
                    <Button startIcon={<Plus />} onClick={() => navigate('new')}>
                      New Media
                    </Button>
                  )
                }
              />
            </Box>
          ) : (
            <>
              <Table colCount={6} rowCount={rows.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Title</Typography></Th>
                    <Th><Typography variant="sigma">Category</Typography></Th>
                    <Th><Typography variant="sigma">Speaker</Typography></Th>
                    <Th><Typography variant="sigma">Date</Typography></Th>
                    <Th><Typography variant="sigma">Status</Typography></Th>
                    <Th><Typography variant="sigma" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>Actions</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Tr key={r.documentId} onClick={() => open(r.documentId)} style={{ cursor: 'pointer' }}>
                      <Td style={{ maxWidth: 380 }}>
                        <Flex direction="column" alignItems="flex-start" gap={0}>
                          <Typography fontWeight="semiBold" ellipsis style={{ maxWidth: 360 }}>
                            {r.title}
                          </Typography>
                          {r.seriesTitle ? (
                            <Typography variant="pi" textColor="neutral600">
                              {r.seriesTitle}
                            </Typography>
                          ) : null}
                        </Flex>
                      </Td>
                      <Td>
                        <Badge>{r.category === 'series' ? 'Series' : 'Sermon'}</Badge>
                      </Td>
                      <Td>
                        <Typography textColor={r.speakerName ? 'neutral800' : 'neutral500'}>
                          {r.speakerName ?? '—'}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(r.date)}</Typography>
                      </Td>
                      <Td>
                        <Badge
                          backgroundColor={`${STATUS[r.status].tone}100`}
                          textColor={`${STATUS[r.status].tone}700`}
                        >
                          {STATUS[r.status].label}
                        </Badge>
                      </Td>
                      <Td onClick={(e) => e.stopPropagation()}>
                        <IconButton label={`Edit ${r.title}`} variant="ghost" onClick={() => open(r.documentId)}>
                          <Pencil />
                        </IconButton>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi" textColor="neutral600">
                  {total === 1 ? '1 message' : `${total} messages`}
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
