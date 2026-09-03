import { describe, it, expect } from 'vitest'
import { createIntl } from 'react-intl'
import { formatRelativeToNow, toRelativeTimeParts } from '@/lib/shared/relative-time'

const NOW = new Date('2026-09-03T12:00:00.000Z')
const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000)

describe('toRelativeTimeParts', () => {
  it.each([
    ['a year', 400 * 86_400, -1, 'year'],
    ['two months', 61 * 86_400, -2, 'month'],
    ['a week', 8 * 86_400, -1, 'week'],
    ['three days', 3 * 86_400, -3, 'day'],
    ['five hours', 5 * 3_600, -5, 'hour'],
    ['ten minutes', 10 * 60, -10, 'minute'],
  ])('reports %s in its own unit', (_label, elapsed, value, unit) => {
    expect(toRelativeTimeParts(secondsAgo(elapsed), NOW)).toEqual({ value, unit })
  })

  // Sub-minute gaps have no coarser unit to fall into; 0 minutes is what
  // `numeric: 'auto'` renders as "this minute" rather than "0 minutes ago".
  it('collapses anything under a minute to zero minutes', () => {
    expect(toRelativeTimeParts(secondsAgo(20), NOW)).toEqual({ value: 0, unit: 'minute' })
  })

  it('reports a future date as a positive value', () => {
    const tomorrow = new Date(NOW.getTime() + 86_400 * 1000)
    expect(toRelativeTimeParts(tomorrow, NOW)).toEqual({ value: 1, unit: 'day' })
  })
})

describe('formatRelativeToNow', () => {
  // The whole point of the helper: the same instant reads in the visitor's
  // language, which date-fns' formatDistanceToNow could not do.
  it('renders in the locale the intl object carries', () => {
    const twoMonthsAgo = new Date(Date.now() - 61 * 86_400 * 1000)
    const english = createIntl({ locale: 'en', messages: {} })
    const swedish = createIntl({ locale: 'sv', messages: {} })

    expect(formatRelativeToNow(english, twoMonthsAgo)).toBe('2 months ago')
    expect(formatRelativeToNow(swedish, twoMonthsAgo)).toBe('för 2 månader sedan')
  })

  it.each([null, undefined, '', 'not-a-date'])('returns empty string for %p', (value) => {
    const intl = createIntl({ locale: 'en', messages: {} })
    expect(formatRelativeToNow(intl, value)).toBe('')
  })
})
