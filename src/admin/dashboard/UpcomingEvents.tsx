import { Box, Flex, Typography } from '@strapi/design-system'
import { Link } from 'react-router-dom'
import { PATH, upcomingEvents } from './derive'
import { Notice, TextLink, WithData } from './parts'
import { dayOfMonth, formatTime, monthShort } from './rules'

/**
 * "Upcoming events" — the next few LIVE events from today on, soonest first.
 * Drafts are left out (the public site can't show them), and so is anything
 * that already happened. Click a row to edit it.
 */
export default function UpcomingEvents() {
  return (
    <WithData>
      {(data) => {
        const { shown, total } = upcomingEvents(data)
        if (shown.length === 0) {
          return (
            <Flex direction="column" alignItems="flex-start" gap={3}>
              <Notice tone="neutral" title="No upcoming events">
                Nothing dated from today on is live on the Events page.
              </Notice>
              <TextLink to={PATH.newEvent}>Add an event</TextLink>
            </Flex>
          )
        }
        return (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {shown.map((e) => (
              <Link key={e.documentId} to={PATH.event(e.documentId)} style={{ textDecoration: 'none' }}>
                <Flex gap={3} alignItems="center">
                  <Box
                    background="primary100"
                    hasRadius
                    style={{ width: 44, flexShrink: 0, textAlign: 'center', padding: '2px 0', lineHeight: 1.1 }}
                  >
                    <Typography variant="sigma" textColor="primary600" tag="div">
                      {monthShort(e.eventDate as string)}
                    </Typography>
                    <Typography variant="delta" fontWeight="bold" textColor="primary700" tag="div">
                      {dayOfMonth(e.eventDate as string)}
                    </Typography>
                  </Box>
                  <Flex direction="column" alignItems="flex-start" gap={0}>
                    <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                      {e.eventName}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {[formatTime(e.eventTime), e.eventLocation].filter(Boolean).join(' · ')}
                    </Typography>
                  </Flex>
                </Flex>
              </Link>
            ))}
            {total > shown.length ? (
              <Typography variant="pi" textColor="neutral600">
                +{total - shown.length} more — see All events
              </Typography>
            ) : null}
          </Flex>
        )
      }}
    </WithData>
  )
}
