import { Box, Flex, Typography } from '@strapi/design-system'
import { librarySnapshot } from './derive'
import { WithData } from './parts'

/**
 * "Library snapshot" — how big the library is and how it's growing.
 *
 * Counts come from the same lists the other widgets use. The two charts are
 * plain CSS bars rather than a chart library: the admin bundle stays
 * small, and there is nothing to theme — the bars use the design system's
 * own colour tokens, so both the light and dark admin look right.
 *
 *   · Messages per month — LIVE messages by the date they were preached
 *     (not the date they were published), last MONTHS_SHOWN months.
 *   · YouTube vs upload — LIVE messages by media type. Worth watching:
 *     uploaded video is what grows storage and bandwidth cost.
 */
export default function LibrarySnapshot() {
  return (
    <WithData>
      {(data) => {
        const s = librarySnapshot(data)
        const mediaTotal = s.youtube + s.upload
        const ytPct = mediaTotal ? Math.round((s.youtube / mediaTotal) * 100) : 0

        const stats: { label: string; value: string; sub?: string }[] = [
          { label: 'Messages', value: String(s.messages), sub: `${s.live} live · ${s.drafts} draft` },
          { label: 'Series', value: String(s.series) },
          { label: 'Speakers', value: s.speakers == null ? '–' : String(s.speakers) },
          { label: 'Topics', value: s.topics == null ? '–' : String(s.topics) },
        ]

        return (
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Flex gap={3} wrap="wrap" alignItems="stretch">
              {stats.map((t) => (
                <Box
                  key={t.label}
                  background="neutral100"
                  hasRadius
                  padding={3}
                  borderColor="neutral200"
                  borderStyle="solid"
                  borderWidth="1px"
                  style={{ flex: '1 1 140px' }}
                >
                  <Typography variant="sigma" textColor="neutral600" tag="div">
                    {t.label.toUpperCase()}
                  </Typography>
                  <Typography variant="beta" fontWeight="bold" tag="div">
                    {t.value}
                  </Typography>
                  {t.sub ? (
                    <Typography variant="pi" textColor="neutral600" tag="div">
                      {t.sub}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Flex>

            <Flex gap={8} wrap="wrap" alignItems="flex-start">
              <Box style={{ flex: '2 1 300px' }}>
                <Typography variant="sigma" textColor="neutral600" tag="div">
                  LIVE MESSAGES PER MONTH
                </Typography>
                <Flex gap={3} alignItems="flex-end" paddingTop={2} style={{ height: 96 }} role="img"
                  aria-label={`Live messages per month: ${s.months.map((m) => `${m.label} ${m.count}`).join(', ')}`}>
                  {s.months.map((m) => (
                    <Flex key={m.key} direction="column" alignItems="center" justifyContent="flex-end" gap={1} style={{ flex: 1, height: '100%' }}>
                      <Typography variant="pi" textColor="neutral700">
                        {m.count}
                      </Typography>
                      <Box
                        background={m.count ? 'primary600' : 'neutral200'}
                        hasRadius
                        style={{ width: '100%', maxWidth: 40, height: `${Math.max(4, (m.count / s.maxMonth) * 44)}px` }}
                      />
                      <Typography variant="pi" textColor="neutral600">
                        {m.label}
                      </Typography>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              <Box style={{ flex: '1 1 220px' }}>
                <Typography variant="sigma" textColor="neutral600" tag="div">
                  YOUTUBE VS UPLOADED VIDEO
                </Typography>
                {mediaTotal === 0 ? (
                  <Box paddingTop={3}>
                    <Typography variant="pi" textColor="neutral600">
                      No live messages yet.
                    </Typography>
                  </Box>
                ) : (
                  <Box paddingTop={3}>
                    <Flex
                      hasRadius
                      style={{ height: 14, overflow: 'hidden' }}
                      background="neutral200"
                      role="img"
                      aria-label={`${s.youtube} YouTube, ${s.upload} uploaded`}
                    >
                      <Box background="primary600" style={{ width: `${ytPct}%`, height: '100%' }} />
                    </Flex>
                    <Flex justifyContent="space-between" paddingTop={2}>
                      <Typography variant="pi" textColor="neutral700">
                        YouTube · {s.youtube}
                      </Typography>
                      <Typography variant="pi" textColor="neutral700">
                        Uploaded · {s.upload}
                      </Typography>
                    </Flex>
                  </Box>
                )}
              </Box>
            </Flex>
          </Flex>
        )
      }}
    </WithData>
  )
}
