import { Button, Field, Flex, Popover, Typography } from '@strapi/design-system'
import { Clock, Cross } from '@strapi/icons'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTheme } from 'styled-components'

/**
 * A wheel-style time picker (2026-09-25, Jude: "yung Time Picker, make it
 * like a wheel" — with an iOS-style reference screenshot: hour · minute ·
 * AM/PM drums, a highlighted centre band, rows fading and tilting away).
 *
 * Replaces the design system's TimePicker, which is a long dropdown list
 * of every time slot — slow to scroll and easy to overshoot. This one:
 *
 *   · opens from a field that looks like every other input in the admin
 *     (same height, border, radius, error state — read from the theme so
 *     it follows light/dark mode too);
 *   · shows three drums that snap to a row as you scroll, drag a trackpad,
 *     or click a row; hours and minutes loop (…11, 12, 1, 2…) like a
 *     real wheel, AM/PM doesn't;
 *   · updates the value as each drum settles, so there's no separate
 *     "confirm" step — Done or clicking away just closes it;
 *   · is keyboard-usable: each drum is a spinbutton (↑/↓, Page Up/Down,
 *     Home/End), and screen readers hear "Hour, 9" etc.
 *
 * `value` / `onChange` are a 24-hour "HH:mm" string ('' for none) — the
 * same shape the DS TimePicker used, so callers convert with the same
 * toIsoTime/fromIsoTime helpers as before.
 *
 * Lives next to Stepper and FileDrop so both wizards share one copy.
 */

const ROW = 36
const VISIBLE = 7 // odd, so one row sits dead centre
const PAD = ((VISIBLE - 1) / 2) * ROW
const LOOP_COPIES = 5 // looping drums render the list 5×, and live in the middle copy

const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
/**
 * Only :00 and :30 are pickable (Jude, 2026-09-28: "make sure na kapag
 * mamimili ng minute, dapat 30 & 00 lang ang options, not 00-59"). `minute`
 * on `Parts` is this array's INDEX (0 or 1), same convention as `period`'s
 * index into PERIODS — not the literal minute number, which is why
 * `parse`/`format` below snap a stored HH:mm to the nearest of the two.
 */
const MINUTES = ['00', '30']
const PERIODS = ['AM', 'PM']

interface Parts {
  hour: number // index into HOURS (0 = 12)
  minute: number // 0–59
  period: number // 0 = AM, 1 = PM
}

function parse(hhmm: string): Parts | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})/)
  if (!m) return null
  const h = Number(m[1])
  // Snap whatever minute is stored (older entries may have any 0–59 value)
  // to the nearest of the two pickable marks, so an existing time still
  // opens somewhere sensible on the wheel instead of pointing off the end
  // of a 2-row array.
  const minute = Math.round(Number(m[2]) / 30) % MINUTES.length
  return { hour: h % 12, minute, period: h >= 12 ? 1 : 0 }
}

function format(p: Parts): string {
  const h = p.hour + (p.period === 1 ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${MINUTES[p.minute]}`
}

function label(p: Parts): string {
  return `${HOURS[p.hour]}:${MINUTES[p.minute]} ${PERIODS[p.period]}`
}

/* ── one drum ─────────────────────────────────────────────────────────── */

function Drum({
  items,
  index,
  onChange,
  loop,
  ariaLabel,
  width,
}: {
  items: string[]
  index: number
  onChange: (i: number) => void
  loop: boolean
  ariaLabel: string
  width: number
}) {
  const theme = useTheme() as any
  const ref = useRef<HTMLDivElement>(null)
  const n = items.length
  const copies = loop ? LOOP_COPIES : 1
  const base = loop ? n * Math.floor(LOOP_COPIES / 2) : 0 // first row of the middle copy
  const rows = useMemo(() => Array.from({ length: n * copies }, (_, p) => items[p % n]), [items, n, copies])
  const settleTimer = useRef<number>()
  const frame = useRef<number>()
  const current = useRef(index)
  /** Row a keyboard/click scroll is heading to, while it's still animating —
   *  so rapid ↓↓↓ presses add up instead of each reading a mid-flight
   *  position. Cleared when the drum settles. */
  const target = useRef<number | null>(null)

  /** Tilt, shrink and fade each row by its distance from the centre line.
   *  Written straight to the DOM — scrolling never re-renders React. */
  const paint = useCallback(() => {
    const el = ref.current
    if (!el) return
    const centre = el.scrollTop + PAD + ROW / 2
    const kids = el.children
    for (let i = 0; i < kids.length; i++) {
      const row = kids[i] as HTMLElement
      const d = (i * ROW + ROW / 2 + PAD - centre) / ROW // rows away from centre
      const a = Math.min(Math.abs(d), 4)
      row.style.transform = `perspective(400px) rotateX(${-d * 16}deg) scale(${1 - a * 0.05})`
      row.style.opacity = String(Math.max(0.12, 1 - a * 0.24))
      row.style.fontWeight = a < 0.5 ? '600' : '400'
    }
  }, [])

  const scrollToRow = useCallback((p: number, smooth: boolean) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: p * ROW, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Position on open, and whenever the value changes from outside.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const at = Math.round(el.scrollTop / ROW)
    if (at % n !== index || (loop && (at < base || at >= base + n)) || el.scrollTop === 0) {
      scrollToRow(base + index, false)
    }
    current.current = index
    paint()
  }, [index, base, n, loop, paint, scrollToRow])

  const settle = useCallback(() => {
    const el = ref.current
    if (!el) return
    target.current = null
    let p = Math.round(el.scrollTop / ROW)
    const i = ((p % n) + n) % n
    // Looping: quietly jump back to the middle copy (same rows, so no
    // visible change) so the wheel never runs out in either direction.
    if (loop && (p < base || p >= base + n)) {
      p = base + i
      scrollToRow(p, false)
      paint()
    }
    if (i !== current.current) {
      current.current = i
      onChange(i)
    }
  }, [n, loop, base, onChange, paint, scrollToRow])

  const onScroll = () => {
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(paint)
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(settle, 110)
  }

  useEffect(
    () => () => {
      window.clearTimeout(settleTimer.current)
      if (frame.current) cancelAnimationFrame(frame.current)
    },
    []
  )

  const step = (delta: number) => {
    const el = ref.current
    if (!el) return
    const from = target.current ?? Math.round(el.scrollTop / ROW)
    const to = loop ? from + delta : Math.min(n - 1, Math.max(0, from + delta))
    target.current = to
    scrollToRow(to, true)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowUp: () => step(-1),
      ArrowDown: () => step(1),
      PageUp: () => step(-5),
      PageDown: () => step(5),
      Home: () => scrollToRow(base, true),
      End: () => scrollToRow(base + n - 1, true),
    }
    const fn = map[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuenow={index}
      aria-valuetext={items[index]}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative',
        zIndex: 1,
        width,
        height: VISIBLE * ROW,
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        paddingBlock: PAD,
        boxSizing: 'border-box',
        outline: 'none',
        borderRadius: 6,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)',
        color: theme.colors.neutral800,
      }}
      className="rog-time-drum"
    >
      {rows.map((text, p) => (
        <div
          key={p}
          aria-hidden="true"
          onClick={() => scrollToRow(p, true)}
          style={{
            height: ROW,
            lineHeight: `${ROW}px`,
            textAlign: 'center',
            fontSize: 20,
            fontVariantNumeric: 'tabular-nums',
            scrollSnapAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            transformOrigin: 'center',
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      ))}
    </div>
  )
}

/* ── the field + popover ─────────────────────────────────────────────── */

export function TimeWheel({
  value,
  onChange,
  onClear,
  placeholder = 'Pick a time',
  clearLabel = 'Clear time',
  defaultTime = '09:00',
}: {
  value: string
  onChange: (hhmm: string) => void
  onClear?: () => void
  placeholder?: string
  clearLabel?: string
  /** Where the drums start when there's no value yet. */
  defaultTime?: string
}) {
  const theme = useTheme() as any
  const field = Field.useField('TimeWheel')
  const [open, setOpen] = useState(false)
  const parts = parse(value)
  const shown = parts ?? parse(defaultTime)!

  const set = (p: Partial<Parts>) => onChange(format({ ...shown, ...p }))

  const error = !!field.error
  const border = error ? theme.colors.danger600 : open ? theme.colors.primary600 : theme.colors.neutral200

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        // Opening an empty field commits the starting time, so what the
        // drums show is what gets saved.
        if (o && !parts) onChange(format(shown))
      }}
    >
      <div style={{ position: 'relative' }}>
        <Popover.Trigger>
          <button
            type="button"
            id={field.id}
            aria-invalid={error || undefined}
            aria-describedby={error ? `${field.id}-error` : field.hint ? `${field.id}-hint` : undefined}
            aria-required={field.required || undefined}
            aria-haspopup="dialog"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              height: 40,
              padding: '0 40px 0 12px',
              border: `1px solid ${border}`,
              borderRadius: theme.borderRadius,
              background: theme.colors.neutral0,
              color: parts ? theme.colors.neutral800 : theme.colors.neutral500,
              fontSize: theme.fontSizes[2],
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: open ? `${theme.colors.primary600} 0px 0px 0px 2px` : 'none',
              transition: 'border-color 120ms ease-out, box-shadow 120ms ease-out',
            }}
          >
            <Clock fill="neutral500" width="1.6rem" height="1.6rem" aria-hidden />
            {parts ? label(parts) : placeholder}
          </button>
        </Popover.Trigger>
        {parts && onClear ? (
          <button
            type="button"
            aria-label={clearLabel}
            title={clearLabel}
            onClick={onClear}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              padding: 6,
              border: 0,
              borderRadius: 4,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <Cross fill="neutral500" width="1.2rem" height="1.2rem" aria-hidden />
          </button>
        ) : null}
      </div>

      <Popover.Content sideOffset={8} align="start" style={{ padding: 16, width: 'auto' }}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 4 }}>
            {/* The highlighted centre band, spanning all three drums. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: PAD,
                height: ROW,
                borderRadius: 8,
                background: theme.colors.neutral150,
                pointerEvents: 'none',
              }}
            />
            <Drum items={HOURS} index={shown.hour} onChange={(hour) => set({ hour })} loop ariaLabel="Hour" width={64} />
            <div
              aria-hidden
              style={{
                position: 'relative',
                zIndex: 1,
                alignSelf: 'center',
                fontSize: 20,
                fontWeight: 600,
                color: theme.colors.neutral800,
              }}
            >
              :
            </div>
            <Drum items={MINUTES} index={shown.minute} onChange={(minute) => set({ minute })} loop ariaLabel="Minute" width={64} />
            <Drum items={PERIODS} index={shown.period} onChange={(period) => set({ period })} loop={false} ariaLabel="AM or PM" width={64} />
          </div>
          <Flex justifyContent="space-between" alignItems="center">
            <Typography variant="pi" textColor="neutral600" aria-live="polite">
              {label(shown)}
            </Typography>
            <Button size="S" onClick={() => setOpen(false)}>
              Done
            </Button>
          </Flex>
        </Flex>
        {/* Hide the drums' scrollbars in WebKit (scrollbarWidth covers Firefox). */}
        <style>{'.rog-time-drum::-webkit-scrollbar{display:none}.rog-time-drum:focus-visible{box-shadow:0 0 0 2px ' + theme.colors.primary600 + '}@media (prefers-reduced-motion: reduce){.rog-time-drum{scroll-behavior:auto}}'}</style>
      </Popover.Content>
    </Popover.Root>
  )
}
