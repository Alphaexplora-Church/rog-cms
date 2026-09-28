import { Box, DatePicker, Field, Flex, Grid, Textarea, Typography } from '@strapi/design-system'
import type { ReactNode } from 'react'
import type { EventDraft } from '../api'
import { FileDrop } from '../../messages/components/FileDrop'
import { TimeWheel } from '../../messages/components/TimeWheel'
import { fromIsoTime, pickerDay, toIsoDate, toIsoTime, toPickerDate, type Errors } from '../rules'

/**
 * Phase 1 — Contents. Straight to the form, no category choice (Jude,
 * 2026-09-24: "sa Phase 1, rekta forms na agad") — six fields:
 *
 *   Event Name · Event Date · Event Time · Event Location ·
 *   Event Description · Header Photo
 *
 * 2026-09-25: Event Location added; the time field is now the wheel-style
 * TimeWheel (Jude's iOS-style reference) instead of the DS TimePicker's
 * dropdown list; and the date field reads through toPickerDate, fixing
 * the picked-Oct-3-shows-Oct-2 bug (see messages/rules.ts).
 *
 * Same numbered-card layout as the Media Library wizard's ContentStep, and
 * the same FileDrop component, imported from there rather than copied.
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
  draft: EventDraft
  patch: (p: Partial<EventDraft>) => void
  errors: Errors
}

export function ContentStep({ draft, patch, errors }: ContentStepProps) {
  let n = 0
  const next = () => (n += 1)

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          Event details
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          Fields marked * are required. Nothing is saved until you publish on the next phase.
        </Typography>
      </Flex>

      <Section n={next()} title="Name, date, time and place">
        <Grid.Root gap={5}>
          <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="eventName" error={errors.eventName} required>
              <Field.Label>Event Name</Field.Label>
              <Field.Input
                value={draft.eventName}
                placeholder="e.g. Christmas Eve Service"
                onChange={(e) => patch({ eventName: e.target.value })}
              />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
          <Grid.Item col={6} s={12} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="eventDate" error={errors.eventDate} required>
              <Field.Label>Event Date</Field.Label>
              <DatePicker
                value={toPickerDate(draft.eventDate)}
                onChange={(d) => patch({ eventDate: d ? toIsoDate(d) : '' })}
                onClear={() => patch({ eventDate: '' })}
                clearLabel="Clear date"
                minDate={pickerDay()}
              />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
          <Grid.Item col={3} s={6} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="eventTime" error={errors.eventTime} required>
              <Field.Label>Start Time</Field.Label>
              <TimeWheel
                value={fromIsoTime(draft.eventTime)}
                onChange={(t) => patch({ eventTime: t ? toIsoTime(t) : '' })}
                onClear={() => patch({ eventTime: '' })}
                clearLabel="Clear time"
              />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
          <Grid.Item col={3} s={6} xs={12} direction="column" alignItems="stretch">
            <Field.Root name="eventEndTime" error={errors.eventEndTime} hint="Optional.">
              <Field.Label>End Time</Field.Label>
              <TimeWheel
                value={fromIsoTime(draft.eventEndTime)}
                onChange={(t) => patch({ eventEndTime: t ? toIsoTime(t) : '' })}
                onClear={() => patch({ eventEndTime: '' })}
                clearLabel="Clear time"
                defaultTime={fromIsoTime(draft.eventTime) || '09:00'}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
          <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
            <Field.Root
              name="eventLocation"
              error={errors.eventLocation}
              required
              hint="The venue, as it should read on the website."
            >
              <Field.Label>Event Location</Field.Label>
              <Field.Input
                value={draft.eventLocation}
                placeholder="e.g. River of God Center — Lower Ground, Main Wing, Shangri-La Plaza"
                onChange={(e) => patch({ eventLocation: e.target.value })}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Grid.Item>
        </Grid.Root>
      </Section>

      <Section n={next()} title="Description">
        <Field.Root name="eventDescription" error={errors.eventDescription} required hint="Shown on the event's card on the website.">
          <Field.Label>Event Description</Field.Label>
          <Textarea
            value={draft.eventDescription}
            placeholder="What's happening, and why it matters to come."
            onChange={(e) => patch({ eventDescription: e.target.value })}
          />
          <Field.Hint />
          <Field.Error />
        </Field.Root>
      </Section>

      <Section n={next()} title="Header photo">
        <Grid.Root gap={5}>
          <Grid.Item col={6} s={12} xs={12} direction="column" alignItems="stretch">
            <FileDrop
              kind="image"
              label="Header Photo"
              required
              hint="The picture shown on the event's card and its header. Wide images work best (16:9)."
              value={draft.headerPhoto}
              onChange={(v) => patch({ headerPhoto: v })}
              error={errors.headerPhoto}
            />
          </Grid.Item>
        </Grid.Root>
      </Section>

      <Section n={next()} title="Registration">
        <Field.Root
          name="registrationLink"
          error={errors.registrationLink}
          hint={'Optional. When set, the website shows a "Click here to register" button on this event.'}
        >
          <Field.Label>Registration Link</Field.Label>
          <Field.Input
            value={draft.registrationLink}
            placeholder="https://forms.gle/..."
            onChange={(e) => patch({ registrationLink: e.target.value })}
          />
          <Field.Hint />
          <Field.Error />
        </Field.Root>
      </Section>
    </Flex>
  )
}
