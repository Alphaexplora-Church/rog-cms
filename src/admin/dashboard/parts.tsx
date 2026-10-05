import { Box, Flex, Typography } from '@strapi/design-system'
import { Widget } from '@strapi/strapi/admin'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, type DashboardData } from './data'

/**
 * Dashboard — the bits every widget shares: the loading / error shell, a
 * text link, and a small status pill. Strapi's own WidgetRoot already draws
 * the card, title and icon, so the widgets render only their body.
 */

/** Renders `children(data)` once the shared load finishes. */
export function WithData({ children }: { children: (data: DashboardData) => ReactNode }) {
  const { loading, error, data } = useDashboard()
  if (loading) return <Widget.Loading />
  if (error || !data) return <Widget.Error>{error ?? 'Could not load this.'}</Widget.Error>
  return <>{children(data)}</>
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <Typography textColor="primary600" fontWeight="semiBold" variant="omega">
        {children}
      </Typography>
    </Link>
  )
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: 'success100', fg: 'success700' },
  warning: { bg: 'warning100', fg: 'warning700' },
  danger: { bg: 'danger100', fg: 'danger700' },
  neutral: { bg: 'neutral150', fg: 'neutral700' },
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Box tag="span" background={TONE[tone].bg} hasRadius paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
      <Typography variant="sigma" textColor={TONE[tone].fg}>
        {children}
      </Typography>
    </Box>
  )
}

/** A full-width tinted notice, e.g. "No message for Sunday yet". */
export function Notice({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return (
    <Box background={TONE[tone].bg} hasRadius padding={4}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="omega" fontWeight="bold" textColor={TONE[tone].fg}>
          {title}
        </Typography>
        {children ? (
          <Typography variant="pi" textColor={TONE[tone].fg}>
            {children}
          </Typography>
        ) : null}
      </Flex>
    </Box>
  )
}
