import { Box, Flex, Typography } from '@strapi/design-system'
import { PATH, sundayStatus } from './derive'
import { Notice, Pill, TextLink, WithData } from './parts'
import { formatDay, formatLong, plural } from './rules'

/**
 * "Sunday status" — what the website is showing right now, and whether the
 * week's message has made it up yet.
 *
 * The check is: is there a LIVE message dated on or after the most recent
 * Sunday? Drafts don't count — the site can't see them. On Sunday itself the
 * message usually goes up after service, so that day is a gentle "waiting",
 * not a warning.
 */
export default function SundayStatus() {
  return <WithData>{(data) => <Body data={data} />}</WithData>
}

function Body({ data }: { data: Parameters<typeof sundayStatus>[0] }) {
  const s = sundayStatus(data)
  const due = formatDay(s.dueSunday)

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {s.state === 'ok' && <Notice tone="success" title={`${due}’s message is up`} />}
      {s.state === 'waiting' && (
        <Notice tone="neutral" title="Today’s message isn’t up yet">
          It will show here once you publish it.
        </Notice>
      )}
      {s.state === 'missing' && (
        <Notice tone="warning" title={`No message yet for ${due}`}>
          The website is still showing an older one.
        </Notice>
      )}
      {s.state !== 'ok' && <TextLink to={PATH.newMessage}>Add a message</TextLink>}

      <Flex direction="column" alignItems="stretch" gap={3}>
        <Box>
          <Typography variant="sigma" textColor="neutral600">
            LATEST MESSAGE
          </Typography>
          {s.latestMessage ? (
            <Flex direction="column" alignItems="flex-start" gap={1} paddingTop={1}>
              <Typography variant="delta" fontWeight="bold">
                {s.latestMessage.title}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {[
                  s.latestMessage.date ? formatLong(s.latestMessage.date) : null,
                  s.latestMessageAgo ? `updated ${s.latestMessageAgo}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
              {s.latestMessage.seriesTitle ? (
                <Pill tone="neutral">{s.latestMessage.seriesTitle}</Pill>
              ) : null}
            </Flex>
          ) : (
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                No messages are live yet.
              </Typography>
            </Box>
          )}
        </Box>

        <Box>
          <Typography variant="sigma" textColor="neutral600">
            LATEST SERIES
          </Typography>
          {s.latestSeries ? (
            <Flex direction="column" alignItems="flex-start" gap={1} paddingTop={1}>
              <Typography variant="delta" fontWeight="bold">
                {s.latestSeries.title}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {[
                  plural(s.latestSeries.episodes, 'episode'),
                  s.latestSeries.lastEpisodeDate ? `last on ${formatDay(s.latestSeries.lastEpisodeDate)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Flex>
          ) : (
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                No series are live yet.
              </Typography>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}
