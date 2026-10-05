import { Flex, Typography } from '@strapi/design-system'
import { Globe, HandHeart, Plant } from '@strapi/icons'
import type { MinistryType } from '../api'
import { ChoiceGroup } from '../../messages/components/ChoiceCard'

/**
 * Phase 1 — Type of Ministry. Same big either/or cards as the Media
 * Library's Category step (ChoiceGroup, imported from ../messages/, not
 * copied). The choice decides which Phase 2 forms appear.
 */
export function TypeStep({
  value,
  onChange,
  error,
}: {
  value: MinistryType | null
  onChange: (t: MinistryType) => void
  error?: string
}) {
  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          What kind of ministry is this?
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          This decides which section of the Ministries page it appears in, and which details come next.
        </Typography>
      </Flex>
      <ChoiceGroup<MinistryType>
        label="Type of Ministry"
        value={value}
        onChange={onChange}
        error={error}
        choices={[
          {
            value: 'ages',
            title: 'Ages of the River',
            description: 'A life-stage ministry for an age group — River Kids, River Youth, Young Adults…',
            icon: <Plant />,
          },
          {
            value: 'service',
            title: 'Service Ministries',
            description: 'A #SavedToServe serving team looking for volunteers — Ushering, Worship Team…',
            icon: <HandHeart />,
          },
          {
            value: 'body',
            title: 'Body of Christ Ministries',
            description: 'A ministry ROG runs for the wider Body of Christ — Soaking in the River, Activate…',
            icon: <Globe />,
          },
        ]}
      />
    </Flex>
  )
}
