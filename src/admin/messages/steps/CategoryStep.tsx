import { Flex, Typography } from '@strapi/design-system'
import { Microphone, Stack } from '@strapi/icons'
import type { Category } from '../api'
import { ChoiceGroup } from '../components/ChoiceCard'

/** Phase 1 — "Select Category: ano ang iuupload." */
export function CategoryStep({
  value,
  onChange,
  error,
}: {
  value: Category | null
  onChange: (c: Category) => void
  error?: string
}) {
  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="beta" tag="h2">
          What are you uploading?
        </Typography>
        <Typography variant="omega" textColor="neutral600">
          This decides which details come next. You can come back and change it.
        </Typography>
      </Flex>
      <ChoiceGroup<Category>
        label="Category"
        value={value}
        onChange={onChange}
        error={error}
        choices={[
          {
            value: 'series',
            title: 'Series',
            description: 'One part of a named series — I AM, Exodus, Ecclesiastes…',
            icon: <Stack />,
          },
          {
            value: 'sermon',
            title: 'A Sermon',
            description: 'A Sunday Service or Midweek Service message.',
            icon: <Microphone />,
          },
        ]}
      />
    </Flex>
  )
}
