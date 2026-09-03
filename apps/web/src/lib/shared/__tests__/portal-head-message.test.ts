import { describe, it, expect } from 'vitest'
import { portalHeadMessage } from '@/lib/shared/portal-head-message'

const DESCRIPTOR = { id: 'portal.hc.home.defaultTitle', defaultMessage: 'How can we help?' }

const matchesWith = (messages: Record<string, string>) => [
  { routeId: '__root__', loaderData: undefined },
  { routeId: '/_portal', loaderData: { messages } },
  { routeId: '/_portal/hc/', loaderData: {} },
]

describe('portalHeadMessage', () => {
  it('reads the translation off the _portal match catalog', () => {
    const matches = matchesWith({ 'portal.hc.home.defaultTitle': 'Hur kan vi hjälpa till?' })
    expect(portalHeadMessage(matches, DESCRIPTOR)).toBe('Hur kan vi hjälpa till?')
  })

  // A head() that ran before the portal loader resolved, or a catalog missing
  // the key, must still title the page rather than render an empty string.
  it.each([
    ['the key is absent', matchesWith({})],
    ['the key is empty', matchesWith({ 'portal.hc.home.defaultTitle': '' })],
    ['there is no _portal match', [{ routeId: '/_portal/hc/', loaderData: {} }]],
    ['there are no matches at all', undefined],
  ])('falls back to the English default when %s', (_label, matches) => {
    expect(portalHeadMessage(matches, DESCRIPTOR)).toBe('How can we help?')
  })
})
