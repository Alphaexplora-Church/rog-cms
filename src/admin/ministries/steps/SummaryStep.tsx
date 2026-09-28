import { Box, Flex, Grid, TextButton, Typography } from '@strapi/design-system'
import { Pencil } from '@strapi/icons'
import { useEffect, useMemo, type ReactNode } from 'react'
import { FIELDS_BY_TYPE, TYPE_LABEL, agesLabel, nameLabel, normalizeHashtags, type Field, type MinistryDraft } from '../api'

/**
 * Phase 3 — Summary. Same layout as the other wizards' Review phase: a
 * small website-style preview on the left, every field with an Edit link on
 * the right (Type → Phase 1, everything else → Phase 2), then Publish.
 */

function useObjectUrl(file: File | undefined) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}

function Row({ label, value, onEdit }: { label: string; value: ReactNode; onEdit: () => void }) {
  return (
    <Flex
      tag="div"
      paddingTop={3}
      paddingBottom={3}
      gap={4}
      alignItems="flex-start"
      style={{ borderBottom: '1px solid var(--rog-review-line, rgba(128,128,128,0.18))' }}
    >
      <Box style={{ flex: '0 0 150px' }}>
        <Typography variant="sigma" textColor="neutral600">
          {label}
        </Typography>
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {typeof value === 'string' ? (
          <Typography variant="omega" style={{ whiteSpace: 'pre-wrap' }}>
            {value}
          </Typography>
        ) : (
          value
        )}
      </Box>
      <TextButton startIcon={<Pencil />} onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>
        Edit
      </TextButton>
    </Flex>
  )
}

const LABEL: Record<Exclude<Field, 'name'>, string> = {
  ages: 'Ages',
  subtitle: 'Subtitle',
  description: 'Description',
  quote: 'Quote',
  contactName: 'Contact Name',
  contactNumber: 'Contact Number',
  hashtags: 'Hashtags',
  coverPhoto: 'Cover Photo',
}

export function SummaryStep({
  draft,
  onEditType,
  onEditDetails,
}: {
  draft: MinistryDraft
  onEditType: () => void
  onEditDetails: () => void
}) {
  const type = draft.ministryType
  const local = useObjectUrl(draft.coverPhoto?.file)
  const photo = local ?? draft.coverPhoto?.existing?.url
  if (!type) return null

  const value = (f: Field): string => {
    if (f === 'coverPhoto') return draft.coverPhoto?.file?.name ?? draft.coverPhoto?.existing?.name ?? 'None — the website shows its placeholder'
    if (f === 'hashtags') return normalizeHashtags(draft.hashtags) || '—'
    return (draft[f] as string).trim() || '—'
  }

  const kicker = type === 'ages' ? agesLabel(draft.ages) : type === 'body' ? draft.subtitle.trim() : '#SavedToServe'

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          Summary
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          Check everything, then publish. Use Edit on any line to change it.
        </Typography>
      </Flex>

      <Grid.Root gap={5}>
        <Grid.Item col={5} s={12} direction="column" alignItems="stretch">
          <Box background="neutral0" hasRadius shadow="tableShadow" padding={4}>
            <Typography variant="sigma" textColor="neutral600">
              Website preview · {TYPE_LABEL[type]}
            </Typography>
            <Box
              marginTop={3}
              hasRadius
              overflow="hidden"
              background="neutral150"
              style={{ aspectRatio: type === 'ages' ? '4 / 5' : '16 / 9', maxHeight: 360 }}
            >
              {photo ? (
                <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <Flex height="100%" justifyContent="center" alignItems="center" padding={4}>
                  <Typography variant="pi" textColor="neutral600" textAlign="center">
                    No cover photo — the website shows its textured placeholder.
                  </Typography>
                </Flex>
              )}
            </Box>
            <Flex paddingTop={3} direction="column" alignItems="flex-start" gap={1}>
              {kicker ? (
                <Typography variant="sigma" textColor="primary600">
                  {kicker}
                </Typography>
              ) : null}
              <Typography variant="delta" tag="p">
                {draft.name.trim() || 'Untitled ministry'}
              </Typography>
              <Typography variant="pi" textColor="neutral600" ellipsis style={{ maxWidth: '100%' }}>
                {draft.description.trim() || '—'}
              </Typography>
            </Flex>
          </Box>
        </Grid.Item>

        <Grid.Item col={7} s={12} direction="column" alignItems="stretch">
          <Box background="neutral0" hasRadius shadow="tableShadow" paddingLeft={6} paddingRight={6} paddingTop={2} paddingBottom={2}>
            <Row label="Type of Ministry" value={TYPE_LABEL[type]} onEdit={onEditType} />
            <Row label={nameLabel(type)} value={value('name')} onEdit={onEditDetails} />
            {FIELDS_BY_TYPE[type]
              .filter((f): f is Exclude<Field, 'name'> => f !== 'name')
              .map((f) => (
                <Row key={f} label={LABEL[f]} value={value(f)} onEdit={onEditDetails} />
              ))}
          </Box>
        </Grid.Item>
      </Grid.Root>
    </Flex>
  )
}
