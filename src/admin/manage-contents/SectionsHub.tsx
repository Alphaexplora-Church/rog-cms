import { Box, Flex, Grid, Typography } from '@strapi/design-system'
import { Calendar, HandHeart, Play } from '@strapi/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * "Manage Contents" — the hub page (Jude, 2026-09-24, modelled on the
 * Vercel dashboard's Projects grid he shared a screenshot of): a heading —
 * "Sections" here, "Projects" on Vercel's — over a grid of cards, one per
 * part of the site the client can manage. Clicking a card opens it.
 *
 * Deliberately the simple version of that card (his call, not the fuller
 * one with a status ring, a menu chevron and a "latest activity" line):
 * icon, name, one line of description. Nothing dynamic to fetch, nothing to
 * keep in sync — just a door into the section.
 *
 * Content Manager, Media Library and Content-Type Builder are hidden from
 * the sidebar and blocked by URL (see BLOCKED_ADMIN_PATH in ../app.tsx);
 * this is where their replacement lives, one card per workflow, as more get
 * built. The message wizard was the first, renamed "Media Library" for the
 * client (it still calls its own items "messages" internally; only the
 * section's own name changed). Events (2026-09-24) is the second — same
 * two-phase wizard shape, no category choice.
 */

interface SectionDef {
  key: string
  to: string
  icon: ReactNode
  label: string
  description: string
}

const SECTIONS: SectionDef[] = [
  {
    key: 'media-library',
    to: 'media-library',
    icon: <Play width="1.4rem" height="1.4rem" />,
    label: 'Media Library',
    description: 'Sermons and series episodes on the website’s Media page.',
  },
  {
    key: 'events',
    to: 'events',
    icon: <Calendar width="1.4rem" height="1.4rem" />,
    label: 'Events',
    description: 'Gatherings, retreats and conferences on the website’s Events page.',
  },
  {
    key: 'ministries',
    to: 'ministries',
    icon: <HandHeart width="1.4rem" height="1.4rem" />,
    label: 'Ministries',
    description: 'Ages of the River, Service and Body of Christ ministries on the Ministries page.',
  },
]

export function SectionsHub() {
  return (
    <Box padding={{ initial: 4, small: 6, medium: 8 }}>
      <Typography variant="alpha" tag="h1">
        Sections
      </Typography>
      <Box paddingTop={6}>
        <Grid.Root gap={5}>
          {SECTIONS.map((s) => (
            <Grid.Item key={s.key} col={4} s={12} xs={12} direction="column" alignItems="stretch">
              <Link to={s.to} className="rog-section-card" aria-label={`Open ${s.label}`}>
                <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
                  <Flex gap={3} alignItems="center">
                    <Box
                      tag="span"
                      aria-hidden
                      background="primary100"
                      color="primary600"
                      hasRadius
                      style={{
                        width: 40,
                        height: 40,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.icon}
                    </Box>
                    <Flex direction="column" alignItems="flex-start" gap={1}>
                      <Typography variant="delta" tag="h2" fontWeight="bold">
                        {s.label}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600">
                        {s.description}
                      </Typography>
                    </Flex>
                  </Flex>
                </Box>
              </Link>
            </Grid.Item>
          ))}
        </Grid.Root>
      </Box>
    </Box>
  )
}
