import { Box, Flex, Typography } from '@strapi/design-system'
import { Calendar, HandHeart, Play } from '@strapi/icons'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PATH } from './derive'

/**
 * "Quick actions" — three doors straight into the wizards. No data, so it
 * renders instantly. There is no "New post": ROG's CMS has no post type
 * (the site's content is messages, events and ministries).
 *
 * Each tile is one <a>, not a link wrapping a button, so keyboard and
 * screen-reader users get a single control per action.
 */
const ACTIONS: { to: string; label: string; hint: string; icon: ReactNode }[] = [
  { to: PATH.newMessage, label: 'New message', hint: 'Sermon or series episode', icon: <Play width="1.4rem" height="1.4rem" /> },
  { to: PATH.newEvent, label: 'New event', hint: 'Gathering, retreat or conference', icon: <Calendar width="1.4rem" height="1.4rem" /> },
  { to: PATH.newMinistry, label: 'New ministry', hint: 'Appears on the Ministries page', icon: <HandHeart width="1.4rem" height="1.4rem" /> },
]

export default function QuickActions() {
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {ACTIONS.map((a) => (
        <Link key={a.to} to={a.to} aria-label={a.label} style={{ textDecoration: 'none' }}>
          <Box background="neutral100" hasRadius padding={4} borderColor="neutral200" borderStyle="solid" borderWidth="1px">
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
                {a.icon}
              </Box>
              <Flex direction="column" alignItems="flex-start" gap={0}>
                <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                  {a.label}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {a.hint}
                </Typography>
              </Flex>
            </Flex>
          </Box>
        </Link>
      ))}
    </Flex>
  )
}
