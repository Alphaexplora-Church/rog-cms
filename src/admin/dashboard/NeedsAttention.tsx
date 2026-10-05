import { Box, Flex, Typography } from '@strapi/design-system'
import { Link } from 'react-router-dom'
import { attentionGroups } from './derive'
import { Notice, Pill, WithData } from './parts'

/**
 * "Needs attention" — what is missing or out of date, so an editor sees the
 * to-do list without hunting for it. Each group lists its first few items as
 * links straight into the editor, then "+N more".
 *
 * What counts (and deliberately doesn't), so nobody is nagged by a false alarm:
 *   · Missing speaker / thumbnail: LIVE messages only — a draft is allowed to
 *     be unfinished. A YouTube message gets its thumbnail automatically and a
 *     series episode uses its series cover, so only a standalone upload
 *     without a thumbnail is flagged.
 *   · Drafts untouched for STALE_DRAFT_DAYS (see ./rules) — messages and events.
 *   · Live series with no cover or no episodes.
 *   · Live events whose date has already passed.
 */
export default function NeedsAttention() {
  return (
    <WithData>
      {(data) => {
        const groups = attentionGroups(data)
        if (groups.length === 0) {
          return <Notice tone="success" title="Everything looks good">Nothing is missing or out of date.</Notice>
        }
        return (
          <Flex direction="column" alignItems="stretch" gap={4}>
            {groups.map((g) => (
              <Box key={g.key}>
                <Flex gap={2} alignItems="center">
                  <Pill tone={g.tone === 'danger' ? 'danger' : 'warning'}>{g.total}</Pill>
                  <Typography variant="omega" fontWeight="bold">
                    {g.title.replace(/^\d+\s/, '')}
                  </Typography>
                </Flex>
                <Flex direction="column" alignItems="stretch" gap={1} paddingTop={2} paddingLeft={2}>
                  {g.items.map((i) => (
                    <Link key={i.id} to={i.to} style={{ textDecoration: 'none' }}>
                      <Flex gap={2} alignItems="baseline">
                        <Typography variant="pi" textColor="primary600" fontWeight="semiBold">
                          {i.label}
                        </Typography>
                        {i.detail ? (
                          <Typography variant="pi" textColor="neutral600">
                            {i.detail}
                          </Typography>
                        ) : null}
                      </Flex>
                    </Link>
                  ))}
                  {g.more > 0 ? (
                    <Typography variant="pi" textColor="neutral600">
                      +{g.more} more
                    </Typography>
                  ) : null}
                </Flex>
              </Box>
            ))}
          </Flex>
        )
      }}
    </WithData>
  )
}
