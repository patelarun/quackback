/**
 * The platform brand is what upstream hardcoded as "Quackback" on the pre-auth
 * pages, the tab title, the public API reference and the webhook User-Agent.
 *
 * The property worth pinning is the default: an install that configures nothing
 * must render NO platform mark, rather than falling back to the vendor's name.
 * That is the whole point of the indirection, and it is the case a future edit
 * is most likely to break by adding a "sensible" default.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  EMPTY_PLATFORM_BRAND,
  hasPlatformMark,
  webhookUserAgent,
  type PlatformBrand,
} from '../platform-brand'
import { platformDisplayName, platformTotpIssuer } from '@/lib/server/platform-brand'

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
    expect(hasPlatformMark(brand({ name: 'Acme' }))).toBe(true)
  })
})

describe('webhookUserAgent', () => {
  it('stays a stable, non-empty token when unbranded', () => {
    // A receiver may filter on this, so "no brand" must not mean "no UA".
    expect(webhookUserAgent(EMPTY_PLATFORM_BRAND)).toBe('Webhook/1.0')
    expect(webhookUserAgent(null)).toBe('Webhook/1.0')
  })

  it('names the product, and links it when a URL is configured', () => {
    expect(webhookUserAgent(brand({ name: 'Acme' }))).toBe('Acme Webhook/1.0')
    expect(webhookUserAgent(brand({ name: 'Acme', url: 'https://acme.test' }))).toBe(
      'Acme Webhook/1.0 (+https://acme.test)'
    )
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

/**
 * `platformDisplayName` covers the places where a blank is not an option — the
 * issuer in a teammate's authenticator app, the client name on a third-party
 * OAuth consent screen. Those cannot render "nothing", so unlike the mark they
 * need a real fallback, and the one thing it must never be is the upstream
 * vendor's name.
 */
describe('platformDisplayName', () => {
  const BASE = 'https://feedback.acme.test'
  const KEY = 'PLATFORM_BRAND_NAME'
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env[KEY]
    delete process.env[KEY]
  })
  afterEach(() => {
    if (saved === undefined) delete process.env[KEY]
    else process.env[KEY] = saved
  })

  it('prefers the configured brand', () => {
    process.env[KEY] = 'Acme'
    expect(platformDisplayName(BASE)).toBe('Acme')
  })

  it('falls back to the install host, which is meaningful and never a vendor', () => {
    expect(platformDisplayName(BASE)).toBe('feedback.acme.test')
  })

  it('survives a malformed base URL rather than throwing into a sign-in flow', () => {
    // This runs inside auth config construction; a throw here breaks 2FA setup.
    expect(platformDisplayName('not a url')).toBe('Support')
  })

  it('is never empty, so an authenticator entry always has an issuer', () => {
    for (const base of [BASE, '', 'not a url']) {
      expect(platformDisplayName(base).length).toBeGreaterThan(0)
    }
  })
})

/**
 * The authenticator issuer is the one label that must distinguish this app from
 * a SIBLING app on the same brand — an operator running a main product and this
 * support portal under one name would otherwise see two identical entries and
 * no way to tell which six digits belong to which.
 */
describe('platformTotpIssuer', () => {
  const BASE = 'https://feedback.acme.test'
  const KEYS = ['PLATFORM_TOTP_ISSUER', 'PLATFORM_BRAND_NAME'] as const
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('uses its own setting, so it can differ from the brand', () => {
    process.env.PLATFORM_BRAND_NAME = 'Acme'
    process.env.PLATFORM_TOTP_ISSUER = 'Acme - Feedback & Support'
    expect(platformTotpIssuer(BASE)).toBe('Acme - Feedback & Support')
    // The distinguishing half is the point: it must not collapse to the brand.
    expect(platformTotpIssuer(BASE)).not.toBe('Acme')
  })

  it('falls back to the brand when only one app needs an entry', () => {
    process.env.PLATFORM_BRAND_NAME = 'Acme'
    expect(platformTotpIssuer(BASE)).toBe('Acme')
  })

  it('falls back to the host when nothing is configured', () => {
    expect(platformTotpIssuer(BASE)).toBe('feedback.acme.test')
  })

  it('ignores a whitespace-only value rather than issuing a blank label', () => {
    process.env.PLATFORM_BRAND_NAME = 'Acme'
    process.env.PLATFORM_TOTP_ISSUER = '   '
    expect(platformTotpIssuer(BASE)).toBe('Acme')
  })

  it('survives the characters a real issuer contains', () => {
    // "&" and spaces reach an otpauth:// URI; the library percent-encodes both
    // (encodeURIComponent for the label, URLSearchParams for the query), so the
    // value is passed through here untouched rather than pre-sanitised.
    process.env.PLATFORM_TOTP_ISSUER = 'Bokning och Schema - Feedback & Support'
    expect(platformTotpIssuer(BASE)).toBe('Bokning och Schema - Feedback & Support')
  })
})
