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
import { errorMessage, listEvents, type EventRow } from './api'
import { formatDate, formatTime } from './rules'

/**
 * Events — the event wizard's home, same table/list pattern as the Media
 * Library's MessageList.tsx. Every event, newest first, with "New Event"
 * to start the wizard and a row click to edit.
 *
 * Every navigate() below is relative (no leading slash), so this doesn't
 * care what it's mounted under.
 */

const STATUS: Record<EventRow['status'], { label: string; tone: 'success' | 'secondary' | 'warning' }> = {
  published: { label: 'Live', tone: 'success' },
  modified: { label: 'Live · unpublished edits', tone: 'warning' },
  draft: { label: 'Draft', tone: 'secondary' },
}

export default function EventList() {
  const client = useFetchClient()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<EventRow[]>([])
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
    listEvents(client, { page, query: search })
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
      <Page.Title>Events</Page.Title>
      <Layouts.Header
        title="Events"
        subtitle="Gatherings, retreats and conferences on the website’s Events page."
        primaryAction={
          <Button size="L" startIcon={<Plus />} onClick={() => navigate('new')}>
            New Event
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
              placeholder="Search by name…"
            >
              Search events
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
              <Loader>Loading events…</Loader>
            </Flex>
          ) : rows.length === 0 ? (
            <Box background="neutral0" hasRadius shadow="tableShadow">
              <EmptyStateLayout
                content={search ? `No events match “${search}”.` : 'No events yet. Your first one takes about a minute.'}
                action={
                  search ? undefined : (
                    <Button startIcon={<Plus />} onClick={() => navigate('new')}>
                      New Event
                    </Button>
                  )
                }
              />
            </Box>
          ) : (
            <>
              <Table className="rog-list rog-list-events" colCount={6} rowCount={rows.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Event Name</Typography></Th>
                    <Th><Typography variant="sigma">Date</Typography></Th>
                    <Th><Typography variant="sigma">Time</Typography></Th>
                    <Th><Typography variant="sigma">Location</Typography></Th>
                    <Th><Typography variant="sigma">Status</Typography></Th>
                    <Th><Typography variant="sigma" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>Actions</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Tr key={r.documentId} onClick={() => open(r.documentId)} style={{ cursor: 'pointer' }}>
                      <Td style={{ maxWidth: 380 }}>
                        <Typography className="rog-cell-title" fontWeight="semiBold" ellipsis style={{ maxWidth: 360 }}>
                          {r.eventName}
                        </Typography>
                        <Typography className="rog-show-sm" variant="pi" textColor="neutral600">
                          {`${formatDate(r.eventDate)} · ${formatTime(r.eventTime)}`}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(r.eventDate)}</Typography>
                      </Td>
                      <Td>
                        <Typography style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(r.eventTime)}</Typography>
                      </Td>
                      <Td style={{ maxWidth: 260 }}>
                        <Typography textColor={r.eventLocation ? 'neutral800' : 'neutral500'} ellipsis style={{ maxWidth: 240 }}>
                          {r.eventLocation || '—'}
                        </Typography>
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
                        <IconButton label={`Edit ${r.eventName}`} variant="ghost" onClick={() => open(r.documentId)}>
                          <Pencil />
                        </IconButton>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi" textColor="neutral600">
                  {total === 1 ? '1 event' : `${total} events`}
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
