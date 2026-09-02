import { describe, it, expect } from 'vitest'
import { documentLocale, htmlLangDir } from '../document-locale'

// The argument is the matched route-id chain (root -> leaf), as exposed by
// useRouterState's `matches`.
describe('documentLocale', () => {
  it('localizes any page under the portal layout', () => {
    expect(
      documentLocale(['__root__', '/_portal', '/_portal/'], {
        customerFacing: 'zh-cn',
        internal: 'de',
      })
    ).toBe('zh-cn')
    expect(
      documentLocale(['__root__', '/_portal', '/_portal/hc'], {
        customerFacing: 'zh-cn',
        internal: 'de',
      })
    ).toBe('zh-cn')
    expect(
      documentLocale(['__root__', '/_portal', '/_portal/roadmap/'], {
        customerFacing: 'zh-tw',
        internal: 'de',
      })
    ).toBe('zh-tw')
  })
  it('localizes the standalone auth and widget routes', () => {
    expect(
      documentLocale(['__root__', '/auth/reset-password'], {
        customerFacing: 'zh-cn',
        internal: 'de',
      })
    ).toBe('zh-cn')
    expect(documentLocale(['__root__', '/widget'], { customerFacing: 'ar', internal: 'de' })).toBe(
      'ar'
    )
  })
  it('keeps untranslated auth utility pages on the fallback locale', () => {
    // These render hard-coded English with no IntlProvider — labeling them
    // `lang="ar" dir="rtl"` would misstate the language and flip the layout.
    expect(
      documentLocale(['__root__', '/auth/login'], { customerFacing: 'ar', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/auth/signup'], { customerFacing: 'zh-cn', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/auth/two-factor'], { customerFacing: 'ar', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/auth/auth-complete'], {
        customerFacing: 'zh-cn',
        internal: 'de',
      })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/auth/widget-handoff'], {
        customerFacing: 'zh-tw',
        internal: 'de',
      })
    ).toBe('en')
  })
  it('gives the admin automation pages the teammate locale, not the visitor one', () => {
    // The workspace's customer-facing default language must not leak into
    // staff tooling: automation follows the teammate's own browser.
    expect(
      documentLocale(['__root__', '/admin/automation', '/admin/automation/'], {
        customerFacing: 'sv',
        internal: 'de',
      })
    ).toBe('de')
  })
  it('keeps the admin app (incl. its English-first login) and system routes on the fallback', () => {
    // /admin/login renders an English heading + email stage on first paint, so
    // it stays English until that copy is localized.
    expect(
      documentLocale(['__root__', '/admin/login'], { customerFacing: 'ar', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/admin/posts'], { customerFacing: 'zh-cn', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/onboarding'], { customerFacing: 'ar', internal: 'de' })
    ).toBe('en')
    expect(documentLocale(['__root__', '/apps'], { customerFacing: 'zh-cn', internal: 'de' })).toBe(
      'en'
    )
    expect(
      documentLocale(['__root__', '/unsubscribe'], { customerFacing: 'zh-cn', internal: 'de' })
    ).toBe('en')
    expect(
      documentLocale(['__root__', '/verify-magic-link'], {
        customerFacing: 'zh-cn',
        internal: 'de',
      })
    ).toBe('en')
  })
})

describe('htmlLangDir', () => {
  it('emits a canonical BCP-47 lang (upper-cased region subtag)', () => {
    expect(htmlLangDir('zh-cn').lang).toBe('zh-CN')
    expect(htmlLangDir('zh-tw').lang).toBe('zh-TW')
    expect(htmlLangDir('pt-br').lang).toBe('pt-BR')
    expect(htmlLangDir('en').lang).toBe('en') // no region subtag, unchanged
  })
  it('sets dir from the locale', () => {
    expect(htmlLangDir('ar').dir).toBe('rtl')
    expect(htmlLangDir('en').dir).toBe('ltr')
    expect(htmlLangDir('zh-cn').dir).toBe('ltr')
  })
})
