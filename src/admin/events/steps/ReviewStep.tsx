import { Box, Flex, Grid, TextButton, Typography } from '@strapi/design-system'
import { Pencil } from '@strapi/icons'
import { useEffect, useMemo } from 'react'
import type { EventDraft } from '../api'
import { formatDate, formatDuration } from '../rules'

/**
 * Phase 2 — Review/Publish. Same layout as the Media Library wizard's
 * ReviewStep: a website preview on the left, every field with an Edit link
 * back to Phase 1 on the right.
 */

function useObjectUrl(file: File | undefined) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}

function Row({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit: () => void }) {
  return (
    <Flex
      className="rog-review-row"
      tag="div"
      paddingTop={3}
      paddingBottom={3}
      gap={4}
      alignItems="flex-start"
      style={{ borderBottom: '1px solid var(--rog-review-line, rgba(128,128,128,0.18))' }}
    >
      <Box className="rog-review-label" style={{ flex: '0 0 140px' }}>
        <Typography variant="sigma" textColor="neutral600">
          {label}
        </Typography>
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {typeof value === 'string' ? <Typography variant="omega">{value}</Typography> : value}
      </Box>
      <TextButton startIcon={<Pencil />} onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>
        Edit
      </TextButton>
    </Flex>
  )
}

export function ReviewStep({ draft, onEditDetails }: { draft: EventDraft; onEditDetails: () => void }) {
  const photoLocal = useObjectUrl(draft.headerPhoto?.file)
  const photo = photoLocal ?? draft.headerPhoto?.existing?.url

  const meta = [formatDate(draft.eventDate), formatDuration(draft.eventTime, draft.eventEndTime)]
    .filter((v) => v !== '—')
    .join(' · ')

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          Check everything before publishing
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          This is how the event will appear on the website. Use Edit on any line, or Back, to change something.
        </Typography>
      </Flex>

      <Grid.Root gap={5}>
        <Grid.Item col={5} s={12} xs={12} direction="column" alignItems="stretch">
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
            <Typography variant="sigma" textColor="neutral600">
              Website preview
            </Typography>
            <Box
              marginTop={3}
              hasRadius
              overflow="hidden"
              background="neutral150"
              style={{ aspectRatio: '16 / 9' }}
            >
              {photo ? (
                <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <Flex height="100%" justifyContent="center" alignItems="center" padding={4}>
                  <Typography variant="pi" textColor="neutral600" textAlign="center">
                    No image — the website will show its plain placeholder.
                  </Typography>
                </Flex>
              )}
            </Box>
            <Flex paddingTop={3} direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="delta" tag="p">
                {draft.eventName || 'Untitled event'}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {meta || '—'}
              </Typography>
              {draft.eventLocation ? (
                <Typography variant="pi" textColor="neutral600">
                  {draft.eventLocation}
                </Typography>
              ) : null}
            </Flex>
          </Box>
        </Grid.Item>

        <Grid.Item col={7} s={12} xs={12} direction="column" alignItems="stretch">
          <Box background="neutral0" hasRadius shadow="tableShadow" paddingLeft={6} paddingRight={6} paddingTop={2} paddingBottom={2}>
            <Row label="Event Name" value={draft.eventName || '—'} onEdit={onEditDetails} />
            <Row label="Event Date" value={formatDate(draft.eventDate)} onEdit={onEditDetails} />
            <Row label="Duration" value={formatDuration(draft.eventTime, draft.eventEndTime)} onEdit={onEditDetails} />
            <Row label="Event Location" value={draft.eventLocation || '—'} onEdit={onEditDetails} />
            <Row label="Description" value={draft.eventDescription || '—'} onEdit={onEditDetails} />
            <Row
              label="Header Photo"
              onEdit={onEditDetails}
              value={draft.headerPhoto?.file?.name ?? draft.headerPhoto?.existing?.name ?? '—'}
            />
            <Row
              label="Registration Link"
              onEdit={onEditDetails}
              value={draft.registrationLink || 'None — no button shown on the website'}
            />
          </Box>
        </Grid.Item>
      </Grid.Root>
    </Flex>
  )
}
