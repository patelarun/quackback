import type { IntlShape } from 'react-intl'

/**
 * Locale-aware relative time, for surfaces that render under an IntlProvider.
 *
 * date-fns' `formatDistanceToNow` is English-only unless every caller threads a
 * date-fns locale object through, so customer-facing pages use this instead:
 * pick the coarsest unit that still describes the gap, then let
 * `intl.formatRelativeTime` render it in the visitor's language.
 */
export type RelativeTimeUnit = Intl.RelativeTimeFormatUnit

/** Coarsest-first, so the first unit the gap fills is the one we report. */
const SECONDS_PER_UNIT: Array<[RelativeTimeUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

/**
 * Express the gap between `date` and `now` as a signed value plus a unit, ready
 * for `intl.formatRelativeTime`. Past dates yield a negative value ("2 months
 * ago"), future dates a positive one. Anything under a minute reports as
 * 0 minutes, which `numeric: 'auto'` renders as "this minute".
 */
export function toRelativeTimeParts(
  date: Date,
  now: Date = new Date()
): { value: number; unit: RelativeTimeUnit } {
  const elapsedSeconds = (date.getTime() - now.getTime()) / 1000
  const magnitude = Math.abs(elapsedSeconds)

  for (const [unit, secondsPerUnit] of SECONDS_PER_UNIT) {
    if (magnitude >= secondsPerUnit) {
      return { value: Math.round(elapsedSeconds / secondsPerUnit), unit }
    }
  }

  return { value: 0, unit: 'minute' }
}

/**
 * Translated "2 months ago" for a timestamp, or '' when the value is missing or
 * unparseable — the caller's surrounding label ("Last updated …") is only
 * rendered for a real date, so an empty string is never shown on its own.
 */
export function formatRelativeToNow(intl: IntlShape, date: Date | string | null | undefined) {
  if (!date) return ''
  const parsed = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(parsed.getTime())) return ''
  const { value, unit } = toRelativeTimeParts(parsed)
  return intl.formatRelativeTime(value, unit, { numeric: 'auto' })
}
