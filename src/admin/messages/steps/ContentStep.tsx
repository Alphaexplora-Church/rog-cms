import { Box, DatePicker, Field, Flex, Grid, Typography } from '@strapi/design-system'
import { Link as LinkIcon, Upload } from '@strapi/icons'
import type { ReactNode } from 'react'
import type { FileSlot, MessageDraft, SeriesTerm, Term, TermKind } from '../api'
import { ChoiceGroup } from '../components/ChoiceCard'
import { FileDrop } from '../components/FileDrop'
import { SeriesField } from '../components/SeriesField'
import { TermPicker } from '../components/TermPicker'
import { pickerDay, toIsoDate, toPickerDate, youtubeId, youtubeThumb, type Errors } from '../rules'

/**
 * Phase 2 — Contents.
 *
 * Field order is Jude's (2026-09-24), with the date he added afterwards
 * placed beside the title:
 *
 *   Series:  Series · Title + Date · Video · Speaker · Topics · Scripture
 *   Sermon:          Title + Date · Video · Speaker · Topics · Scripture
 *
 * The video field asks first — YouTube link, or upload MP4 — and only then
 * shows the paste box or the drop zones.
 */

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex gap={3} alignItems="center">
          <Box
            tag="span"
            aria-hidden
            background="primary100"
            color="primary600"
            hasRadius
            style={{
              width: 26,
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n}
          </Box>
          <Typography variant="delta" tag="h3">
            {title}
          </Typography>
        </Flex>
        {children}
      </Flex>
    </Box>
  )
}

export interface ContentStepProps {
  draft: MessageDraft
  patch: (p: Partial<MessageDraft>) => void
  errors: Errors
  series: SeriesTerm[]
  terms: Record<TermKind, Term[]>
  onSaveSeries: (v: { documentId?: string; title: string; cover: FileSlot | null }) => Promise<SeriesTerm>
  onCreateTerm: (kind: TermKind, label: string) => Promise<Term>
}

export function ContentStep({ draft, patch, errors, series, terms, onSaveSeries, onCreateTerm }: ContentStepProps) {
  const isSeries = draft.category === 'series'
  let n = 0
  const next = () => (n += 1)

  const ytId = draft.mediaType === 'youtube' ? youtubeId(draft.youtubeUrl) : null
  const seriesCover = isSeries ? draft.series?.cover?.url : undefined

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          {isSeries ? 'Series episode details' : 'Sermon details'}
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          Fields marked * are required. Nothing is saved until you publish on the next phase — except new speakers,
          topics, scripture books and series, which are added to the CMS as soon as you save them.
        </Typography>
      </Flex>

      {isSeries ? (
        <Section n={next()} title="Series">
          <SeriesField
            options={series}
            value={draft.series}
            onChange={(s) => patch({ series: s })}
            onSave={onSaveSeries}
            error={errors.series}
          />
        </Section>
      ) : null}

      <Section n={next()} title="Title and date">
        <Grid.Root gap={5}>
          <Grid.Item col={8} s={12} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="title" error={errors.title} required>
              <Field.Label>Title</Field.Label>
              <Field.Input
                value={draft.title}
                placeholder={isSeries ? 'e.g. I AM the Bread of Life' : 'e.g. The Day Is Approaching'}
                onChange={(e) => patch({ title: e.target.value })}
              />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
          <Grid.Item col={4} s={12} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="date" error={errors.date} required hint="The day it was preached">
              <Field.Label>Date</Field.Label>
              <DatePicker
                value={toPickerDate(draft.date)}
                onChange={(d) => patch({ date: d ? toIsoDate(d) : '' })}
                onClear={() => patch({ date: '' })}
                clearLabel="Clear date"
                maxDate={pickerDay(new Date(new Date().getFullYear() + 1, 11, 31))}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
        </Grid.Root>
      </Section>

      <Section n={next()} title="Video">
        <ChoiceGroup
          label="Where is the video?"
          value={draft.mediaType}
          onChange={(m) => patch({ mediaType: m })}
          error={errors.mediaType}
          choices={[
            {
              value: 'youtube',
              title: 'Paste YouTube link',
              description: 'For livestreams and anything already on the channel. The thumbnail comes from YouTube.',
              icon: <LinkIcon />,
            },
            {
              value: 'upload',
              title: 'Upload MP4',
              description: 'A video file from this computer, up to 200 MB.',
              icon: <Upload />,
            },
          ]}
        />

        {draft.mediaType === 'youtube' ? (
          <Grid.Root gap={5}>
            <Grid.Item col={7} s={12} xs={12} direction="column" alignItems="stretch">
              <Field.Root
                name="youtubeUrl"
                error={errors.youtubeUrl}
                required
                hint="From YouTube’s Share button, or the address bar. Livestream (/live/) links work too."
              >
                <Field.Label>YouTube link</Field.Label>
                <Field.Input
                  value={draft.youtubeUrl}
                  placeholder="https://youtu.be/…"
                  inputMode="url"
                  onChange={(e) => patch({ youtubeUrl: e.target.value })}
                />
                <Field.Hint />
                <Field.Error />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={5} s={12} xs={12} direction="column" alignItems="stretch">
              <Box
                hasRadius
                overflow="hidden"
                background="neutral100"
                style={{ aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {ytId ? (
                  <img
                    src={youtubeThumb(ytId)}
                    alt="YouTube thumbnail for this video"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography variant="pi" textColor="neutral600" textAlign="center" style={{ padding: 16 }}>
                    The YouTube thumbnail appears here once the link is pasted.
                  </Typography>
                )}
              </Box>
            </Grid.Item>
          </Grid.Root>
        ) : null}

        {draft.mediaType === 'upload' ? (
          <Grid.Root gap={5}>
            <Grid.Item col={6} s={12} xs={12} direction="column" alignItems="stretch">
              <FileDrop
                kind="video"
                label="Video file"
                required
                hint="MP4 works everywhere. Up to 200 MB — for full service recordings, use YouTube."
                value={draft.video}
                onChange={(v) => patch({ video: v })}
                error={errors.video}
              />
            </Grid.Item>
            <Grid.Item col={6} s={12} xs={12} direction="column" alignItems="stretch">
              <FileDrop
                kind="image"
                label={isSeries ? 'Thumbnail (optional)' : 'Thumbnail'}
                required={!isSeries}
                hint={
                  isSeries
                    ? seriesCover
                      ? 'Leave empty to use the series cover shown here.'
                      : 'Leave empty to use the series cover — this series has none yet, so a plain placeholder would show.'
                    : 'The picture shown on the message card. Wide images work best (16:9).'
                }
                value={draft.thumbnail}
                onChange={(v) => patch({ thumbnail: v })}
                error={errors.thumbnail}
                fallbackSrc={isSeries ? seriesCover : undefined}
                fallbackNote={isSeries && seriesCover ? 'Using the series cover · click or drop to replace' : undefined}
              />
            </Grid.Item>
          </Grid.Root>
        ) : null}
      </Section>

      <Section n={next()} title="Speaker">
        <TermPicker
          label="Speaker"
          placeholder="Type a name — e.g. Chito Sanchez"
          hint="Optional. Leave empty if no one is credited — the website then shows no speaker."
          options={terms.speaker}
          value={draft.speaker}
          onChange={(v) => patch({ speaker: v })}
          addTitle="Add a speaker"
          addFieldLabel="Speaker name"
          onCreate={(label) => onCreateTerm('speaker', label)}
        />
      </Section>

      <Section n={next()} title="Topics">
        <TermPicker
          multiple
          label="Topics"
          required
          placeholder="Type a topic — e.g. Faith, Prayer"
          hint="Pick one or more. Visitors browse the Media Library by these."
          options={terms.topic}
          value={draft.topics}
          onChange={(v) => patch({ topics: v })}
          error={errors.topics}
          addTitle="Add a topic"
          addFieldLabel="Topic"
          onCreate={(label) => onCreateTerm('topic', label)}
        />
      </Section>

      <Section n={next()} title="Scripture">
        <TermPicker
          label="Scripture"
          placeholder="Type a book — e.g. Genesis, Exodus"
          hint="Optional. The book of the Bible the message is mainly from."
          options={terms.scripture}
          value={draft.scripture}
          onChange={(v) => patch({ scripture: v })}
          addTitle="Add a book of the Bible"
          addFieldLabel="Book"
          onCreate={(label) => onCreateTerm('scripture', label)}
        />
      </Section>
    </Flex>
  )
}
