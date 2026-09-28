import { Box, Field, Flex, Grid, Textarea, Typography } from '@strapi/design-system'
import type { ReactNode } from 'react'
import { TYPE_LABEL, type MinistryDraft } from '../api'
import { FileDrop } from '../../messages/components/FileDrop'
import type { Errors } from '../rules'

/**
 * Phase 2 — the forms for the chosen type (Jude, 2026-09-28):
 *
 *   Ages of the River   Ministry Name · Ages · Description · Cover Photo
 *   Service Ministries  Ministry Name · Description · Quote · Contact Name ·
 *                       Contact Number · Hashtags · Cover Photo
 *   Body of Christ      Title · Subtitle · Description · Cover Photo
 *
 * Same numbered-card layout and FileDrop as the Events and Media Library
 * wizards. Every placeholder is a real ministry's own value, so the editor
 * sees what the website expects.
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

function Text({
  name,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  placeholder,
  inputMode,
}: {
  name: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  hint?: string
  placeholder?: string
  inputMode?: 'tel' | 'text'
}) {
  return (
    <Field.Root name={name} error={error} required={required} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <Field.Input value={value} placeholder={placeholder} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  )
}

function LongText({
  name,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  placeholder,
}: {
  name: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  hint?: string
  placeholder?: string
}) {
  return (
    <Field.Root name={name} error={error} required={required} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <Textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  )
}

export interface DetailsStepProps {
  draft: MinistryDraft
  patch: (p: Partial<MinistryDraft>) => void
  errors: Errors
}

export function DetailsStep({ draft, patch, errors }: DetailsStepProps) {
  const type = draft.ministryType
  if (!type) return null
  let n = 0
  const next = () => (n += 1)

  // A function, not an element: built where it's placed, so its number
  // comes after the sections above it rather than first.
  const cover = () => (
    <Section n={next()} title="Cover photo">
      <Grid.Root gap={5}>
        <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
          <FileDrop
            kind="image"
            label="Cover Photo"
            hint={
              type === 'ages'
                ? 'Shown behind the tall age panel. Portrait photos work best.'
                : 'Shown with this ministry on the website. If left empty, the website keeps its textured placeholder.'
            }
            value={draft.coverPhoto}
            onChange={(v) => patch({ coverPhoto: v })}
            error={errors.coverPhoto}
          />
        </Grid.Item>
      </Grid.Root>
    </Section>
  )

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          {TYPE_LABEL[type]} — details
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          Fields marked * are required. Nothing is saved until you publish on the Summary.
        </Typography>
      </Flex>

      {type === 'ages' ? (
        <>
          <Section n={next()} title="Name and ages">
            <Grid.Root gap={5}>
              <Grid.Item col={7} s={12} direction="column" alignItems="stretch">
                <Text name="name" label="Ministry Name" required value={draft.name} onChange={(v) => patch({ name: v })} error={errors.name} placeholder="e.g. River Kids" />
              </Grid.Item>
              <Grid.Item col={5} s={12} direction="column" alignItems="stretch">
                <Text
                  name="ages"
                  label="Ages"
                  required
                  value={draft.ages}
                  onChange={(v) => patch({ ages: v })}
                  error={errors.ages}
                  placeholder="e.g. 3–12"
                  hint="A range like 3–12 or 51+, or a short phrase like “Married couples”."
                />
              </Grid.Item>
            </Grid.Root>
          </Section>
          <Section n={next()} title="Description">
            <LongText
              name="description"
              label="Description"
              required
              value={draft.description}
              onChange={(v) => patch({ description: v })}
              error={errors.description}
              placeholder="An entry-level experience for kids — games, Bible stories, interactive learning, and lots of fun."
              hint="One or two sentences. It sits under the name on the age panel."
            />
          </Section>
          {cover()}
        </>
      ) : null}

      {type === 'service' ? (
        <>
          <Section n={next()} title="Ministry name">
            <Text name="name" label="Ministry Name" required value={draft.name} onChange={(v) => patch({ name: v })} error={errors.name} placeholder="e.g. Worship Team" />
          </Section>
          <Section n={next()} title="Description and quote">
            <Flex direction="column" alignItems="stretch" gap={5}>
              <LongText
                name="description"
                label="Description"
                required
                value={draft.description}
                onChange={(v) => patch({ description: v })}
                error={errors.description}
                placeholder="What this team does, and why."
              />
              <LongText
                name="quote"
                label="Quote"
                value={draft.quote}
                onChange={(v) => patch({ quote: v })}
                error={errors.quote}
                placeholder="Praying to serve in the Worship Team?"
                hint="The invitation line shown in italics, e.g. “If you love God and it’s your desire to serve His people…”"
              />
            </Flex>
          </Section>
          <Section n={next()} title="Contact">
            <Grid.Root gap={5}>
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Text name="contactName" label="Contact Name" required value={draft.contactName} onChange={(v) => patch({ contactName: v })} error={errors.contactName} placeholder="e.g. Olga Lomuntad" hint="Who volunteers should reach out to." />
              </Grid.Item>
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Text name="contactNumber" label="Contact Number" required inputMode="tel" value={draft.contactNumber} onChange={(v) => patch({ contactNumber: v })} error={errors.contactNumber} placeholder="e.g. 0917 116 3975" hint="Tapping it on a phone dials it." />
              </Grid.Item>
            </Grid.Root>
          </Section>
          <Section n={next()} title="Hashtags">
            <Text
              name="hashtags"
              label="Hashtags"
              value={draft.hashtags}
              onChange={(v) => patch({ hashtags: v })}
              error={errors.hashtags}
              placeholder="#MediaProduction #RMP #MediaforJesus"
              hint="Separate them with spaces. A missing # is added for you."
            />
          </Section>
          {cover()}
        </>
      ) : null}

      {type === 'body' ? (
        <>
          <Section n={next()} title="Title and subtitle">
            <Grid.Root gap={5}>
              <Grid.Item col={7} s={12} direction="column" alignItems="stretch">
                <Text name="name" label="Title" required value={draft.name} onChange={(v) => patch({ name: v })} error={errors.name} placeholder="e.g. Soaking in the River" />
              </Grid.Item>
              <Grid.Item col={5} s={12} direction="column" alignItems="stretch">
                <Text name="subtitle" label="Subtitle" value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} error={errors.subtitle} placeholder="e.g. Events, activities & testimonies" hint="The short line in the pill under the title." />
              </Grid.Item>
            </Grid.Root>
          </Section>
          <Section n={next()} title="Description">
            <LongText
              name="description"
              label="Description"
              required
              value={draft.description}
              onChange={(v) => patch({ description: v })}
              error={errors.description}
              placeholder="Focused on prayer for the nation and encountering the Holy Spirit."
            />
          </Section>
          {cover()}
        </>
      ) : null}
    </Flex>
  )
}
