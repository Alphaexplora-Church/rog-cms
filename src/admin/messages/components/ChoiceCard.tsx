import { Flex, Typography } from '@strapi/design-system'
import type { ReactNode } from 'react'
import { styled } from 'styled-components'

/**
 * A large either/or choice — used for the Category (Series / Sermon) and for
 * the video source (YouTube link / Upload MP4). A real radio group under the
 * hood, so arrow keys move between options and a screen reader announces
 * "1 of 2, selected".
 */

const Card = styled.button<{ $selected: boolean; $invalid: boolean }>`
  flex: 1 1 240px;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spaces[4]};
  margin: 0;
  padding: ${({ theme }) => theme.spaces[5]};
  text-align: left;
  color: inherit;
  border-radius: 12px;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.primary100 : theme.colors.neutral0)};
  border: 1px solid
    ${({ theme, $selected, $invalid }) =>
      $selected ? theme.colors.primary600 : $invalid ? theme.colors.danger600 : theme.colors.neutral200};
  box-shadow: ${({ theme, $selected }) => ($selected ? `0 0 0 1px ${theme.colors.primary600}` : 'none')};
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary600};
  }
`

const Icon = styled.span<{ $selected: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.primary600 : theme.colors.neutral100)};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.neutral0 : theme.colors.neutral700)};
  transition: background-color 160ms ease, color 160ms ease;

  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
`

const Radio = styled.span<{ $selected: boolean }>`
  flex: 0 0 auto;
  margin-left: auto;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid ${({ theme, $selected }) => ($selected ? theme.colors.primary600 : theme.colors.neutral300)};
  box-shadow: ${({ theme, $selected }) => ($selected ? `inset 0 0 0 3px ${theme.colors.neutral0}` : 'none')};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.primary600 : 'transparent')};
`

export interface Choice<T extends string> {
  value: T
  title: string
  description: string
  icon: ReactNode
}

export function ChoiceGroup<T extends string>({
  label,
  choices,
  value,
  onChange,
  error,
}: {
  label: string
  choices: Choice<T>[]
  value: T | null
  onChange: (v: T) => void
  error?: string
}) {
  const focusable = value ?? choices[0]?.value

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const i = Math.max(0, choices.findIndex((c) => c.value === value))
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    const next = choices[(i + dir + choices.length) % choices.length]
    onChange(next.value)
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
    el?.focus()
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex role="radiogroup" aria-label={label} gap={4} wrap="wrap" alignItems="stretch" onKeyDown={onKeyDown}>
        {choices.map((c) => {
          const selected = c.value === value
          return (
            <Card
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-value={c.value}
              tabIndex={c.value === focusable ? 0 : -1}
              $selected={selected}
              $invalid={!!error && !value}
              onClick={() => onChange(c.value)}
            >
              <Icon $selected={selected} aria-hidden>
                {c.icon}
              </Icon>
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="delta" tag="span" textColor="neutral800">
                  {c.title}
                </Typography>
                <Typography variant="omega" tag="span" textColor="neutral600">
                  {c.description}
                </Typography>
              </Flex>
              <Radio $selected={selected} aria-hidden />
            </Card>
          )
        })}
      </Flex>
      {error && !value ? (
        <Typography variant="pi" textColor="danger600" role="alert">
          {error}
        </Typography>
      ) : null}
    </Flex>
  )
}
