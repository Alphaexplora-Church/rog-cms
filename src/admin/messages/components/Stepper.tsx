import { Box, Flex, Typography } from '@strapi/design-system'
import { Check } from '@strapi/icons'
import { styled } from 'styled-components'

/**
 * The wizard's progress bar: three numbered phases on a track that fills as
 * the editor moves forward. A phase already reached is a button, so the
 * editor can jump back to it; one not yet reached is not, because skipping
 * ahead past unvalidated fields would only produce errors later.
 */

export interface StepDef {
  label: string
  hint: string
}

const Track = styled.div`
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.neutral200};
  overflow: hidden;
`

const Fill = styled.div<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary600};
  transition: width 320ms cubic-bezier(0.32, 0.72, 0, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const StepButton = styled.button<{ $state: 'done' | 'current' | 'todo' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[2]}`};
  margin: 0;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  color: inherit;

  /* The admin skin lifts every button on hover; a step isn't a CTA. */
  &:hover {
    transform: none !important;
  }
`

const Dot = styled.span<{ $state: 'done' | 'current' | 'todo' }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
  ${({ theme, $state }) =>
    $state === 'todo'
      ? `background:${theme.colors.neutral100};color:${theme.colors.neutral600};box-shadow:inset 0 0 0 1px ${theme.colors.neutral300};`
      : $state === 'current'
        ? `background:${theme.colors.primary600};color:${theme.colors.neutral0};box-shadow:0 0 0 4px ${theme.colors.primary100};`
        : `background:${theme.colors.primary100};color:${theme.colors.primary600};box-shadow:inset 0 0 0 1px ${theme.colors.primary200};`}

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
`

export function Stepper({
  steps,
  current,
  reached,
  onGo,
}: {
  steps: StepDef[]
  /** 0-based index of the phase on screen. */
  current: number
  /** Highest phase index the editor has reached; those at or below it are clickable. */
  reached: number
  onGo: (index: number) => void
}) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100

  return (
    <Box
      tag="nav"
      aria-label="Progress"
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      paddingTop={5}
      paddingBottom={5}
      paddingLeft={6}
      paddingRight={6}
    >
      <Flex tag="ol" gap={4} justifyContent="space-between" wrap="wrap" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo'
          const clickable = i <= reached && i !== current
          return (
            <li key={s.label} style={{ flex: '1 1 180px' }}>
              <StepButton
                type="button"
                $state={state}
                disabled={!clickable}
                aria-current={i === current ? 'step' : undefined}
                onClick={() => clickable && onGo(i)}
              >
                <Dot $state={state} aria-hidden>
                  {state === 'done' ? <Check /> : i + 1}
                </Dot>
                <Flex direction="column" alignItems="flex-start" gap={0}>
                  <Typography
                    variant="omega"
                    fontWeight="bold"
                    textColor={state === 'todo' ? 'neutral600' : 'neutral800'}
                  >
                    {`Phase ${i + 1} · ${s.label}`}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {s.hint}
                  </Typography>
                </Flex>
              </StepButton>
            </li>
          )
        })}
      </Flex>
      <Box paddingTop={4}>
        <Track
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-valuetext={`Phase ${current + 1} of ${steps.length}: ${steps[current]?.label ?? ''}`}
        >
          <Fill $pct={pct} />
        </Track>
      </Box>
    </Box>
  )
}
