import { Badge, Box, Flex, Grid, TextButton, Typography } from '@strapi/design-system'
import { Pencil } from '@strapi/icons'
import { useEffect, useMemo } from 'react'
import type { MessageDraft } from '../api'
import { formatDate, youtubeId, youtubeThumb } from '../rules'

/**
 * Phase 3 — "Preview/Clarification, Back button for edits."
 *
 * Top: the message as its card will look on the website (thumbnail, title,
 * speaker · date). Below: every field, each with a way back to fix it.
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

export function ReviewStep({
  draft,
  onEditCategory,
  onEditDetails,
}: {
  draft: MessageDraft
  onEditCategory: () => void
  onEditDetails: () => void
}) {
  const isSeries = draft.category === 'series'
  const isUpload = draft.mediaType === 'upload'
  const ytId = !isUpload ? youtubeId(draft.youtubeUrl) : null

  const thumbLocal = useObjectUrl(draft.thumbnail?.file)
  const videoLocal = useObjectUrl(draft.video?.file)

  const thumbnail = isUpload
    ? (thumbLocal ?? draft.thumbnail?.existing?.url ?? (isSeries ? draft.series?.cover?.url : undefined))
    : ytId
      ? youtubeThumb(ytId)
      : undefined
  const thumbFromSeries = isUpload && isSeries && !draft.thumbnail && !!draft.series?.cover

  const meta = [draft.speaker?.label, formatDate(draft.date)].filter(Boolean).join(' · ')

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          Check everything before publishing
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          This is how the message will appear on the website. Use Edit on any line, or Back, to change something.
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
              {thumbnail ? (
                <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <Flex height="100%" justifyContent="center" alignItems="center" padding={4}>
                  <Typography variant="pi" textColor="neutral600" textAlign="center">
                    No image — the website will show its plain placeholder.
                  </Typography>
                </Flex>
              )}
            </Box>
            <Flex paddingTop={3} direction="column" alignItems="flex-start" gap={1}>
              {isSeries && draft.series ? (
                <Typography variant="pi" fontWeight="bold" textColor="primary600" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {draft.series.label}
                </Typography>
              ) : null}
              <Typography variant="delta" tag="p">
                {draft.title || 'Untitled'}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {meta}
              </Typography>
            </Flex>
            {thumbFromSeries ? (
              <Box paddingTop={2}>
                <Typography variant="pi" textColor="neutral600">
                  Thumbnail: using the series cover.
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Grid.Item>

        <Grid.Item col={7} s={12} xs={12} direction="column" alignItems="stretch">
          <Box background="neutral0" hasRadius shadow="tableShadow" paddingLeft={6} paddingRight={6} paddingTop={2} paddingBottom={2}>
            <Row
              label="Category"
              value={<Badge active>{isSeries ? 'Series' : 'Sermon'}</Badge>}
              onEdit={onEditCategory}
            />
            {isSeries ? <Row label="Series" value={draft.series?.label ?? '—'} onEdit={onEditDetails} /> : null}
            <Row label="Title" value={draft.title || '—'} onEdit={onEditDetails} />
            <Row label="Date" value={formatDate(draft.date)} onEdit={onEditDetails} />
            <Row
              label="Video"
              onEdit={onEditDetails}
              value={
                isUpload ? (
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    <Typography variant="omega">
                      Uploaded file · {draft.video?.file?.name ?? draft.video?.existing?.name ?? '—'}
                    </Typography>
                    {videoLocal ?? draft.video?.existing?.url ? (
                      <video
                        src={videoLocal ?? draft.video?.existing?.url}
                        controls
                        preload="metadata"
                        style={{ width: '100%', maxWidth: 360, borderRadius: 8, background: '#000' }}
                      />
                    ) : null}
                  </Flex>
                ) : (
                  <Typography variant="omega" style={{ wordBreak: 'break-all' }}>
                    YouTube · {draft.youtubeUrl}
                  </Typography>
                )
              }
            />
            <Row label="Speaker" value={draft.speaker?.label ?? 'None — no speaker shown'} onEdit={onEditDetails} />
            <Row
              label="Topics"
              onEdit={onEditDetails}
              value={
                <Flex gap={2} wrap="wrap">
                  {draft.topics.map((t) => (
                    <Badge key={t.documentId}>{t.label}</Badge>
                  ))}
                </Flex>
              }
            />
            <Row label="Scripture" value={draft.scripture?.label ?? 'None'} onEdit={onEditDetails} />
          </Box>
        </Grid.Item>
      </Grid.Root>
    </Flex>
  )
}
