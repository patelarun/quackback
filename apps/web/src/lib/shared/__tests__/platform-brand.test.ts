/**
 * The platform brand is what upstream hardcoded as "Quackback" on the pre-auth
 * pages, the tab title, the public API reference and the webhook User-Agent.
 *
 * The property worth pinning is the default: an install that configures nothing
 * must render NO platform mark, rather than falling back to the vendor's name.
 * That is the whole point of the indirection, and it is the case a future edit
 * is most likely to break by adding a "sensible" default.
 */
import { describe, it, expect } from 'vitest'
import {
  EMPTY_PLATFORM_BRAND,
  hasPlatformMark,
  webhookUserAgent,
  type PlatformBrand,
} from '../platform-brand'

const brand = (over: Partial<PlatformBrand> = {}): PlatformBrand => ({
  ...EMPTY_PLATFORM_BRAND,
  ...over,
})

describe('hasPlatformMark', () => {
  it('is false when nothing is configured', () => {
    expect(hasPlatformMark(EMPTY_PLATFORM_BRAND)).toBe(false)
    expect(hasPlatformMark(null)).toBe(false)
    expect(hasPlatformMark(undefined)).toBe(false)
  })

  it('is false for a name that is only whitespace', () => {
    expect(hasPlatformMark(brand({ name: '   ' }))).toBe(false)
  })

  it('is false for a logo with no name — the mark is the name', () => {
    expect(hasPlatformMark(brand({ logoUrl: 'https://example.com/logo.png' }))).toBe(false)
  })

  it('is true once a name is set', () => {
    expect(hasPlatformMark(brand({ name: 'Bokning och Schema' }))).toBe(true)
  })
})

describe('webhookUserAgent', () => {
  it('stays a stable, non-empty token when unbranded', () => {
    // A receiver may filter on this, so "no brand" must not mean "no UA".
    expect(webhookUserAgent(EMPTY_PLATFORM_BRAND)).toBe('Webhook/1.0')
    expect(webhookUserAgent(null)).toBe('Webhook/1.0')
  })

  it('names the product, and links it when a URL is configured', () => {
    expect(webhookUserAgent(brand({ name: 'Bokning och Schema' }))).toBe(
      'Bokning och Schema Webhook/1.0'
    )
    expect(
      webhookUserAgent(brand({ name: 'Bokning och Schema', url: 'https://app.bokningoschema.se' }))
    ).toBe('Bokning och Schema Webhook/1.0 (+https://app.bokningoschema.se)')
  })

  it('carries no trace of the upstream vendor in any state', () => {
    for (const value of [
      webhookUserAgent(EMPTY_PLATFORM_BRAND),
      webhookUserAgent(brand({ name: 'Acme', url: 'https://acme.test' })),
    ]) {
      expect(value.toLowerCase()).not.toContain('quackback')
    }
  })
})
