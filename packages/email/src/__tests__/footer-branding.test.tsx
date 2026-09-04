/**
 * The line at the bottom of a branded email that says who sent it.
 *
 * It used to be a fixed "Powered by Quackback" link compiled into the layout.
 * It is now two environment variables, and the properties worth pinning are the
 * ones an operator would be surprised by: an install that configures nothing
 * gets no line at all rather than a vendor's name, and a label without a URL
 * stays text rather than quietly acquiring an anchor.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@react-email/components'
import { readEmailFooterBranding } from '../footer-branding'
import { WelcomeEmail } from '../templates/welcome'
import { SignupNotAllowedEmail } from '../templates/signup-not-allowed'

const BRANDING_KEYS = ['EMAIL_FOOTER_BRANDING_TEXT', 'EMAIL_FOOTER_BRANDING_URL'] as const

const LABEL = 'Bokning och Schema Support'
const URL = 'https://app.bokningoschema.se'

function renderWelcome(): Promise<string> {
  return render(
    WelcomeEmail({
      name: 'Alice',
      workspaceName: 'Acme',
      dashboardUrl: 'https://example.com/dashboard',
    })
  )
}

describe('email footer branding', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    // The repo's own .env sets these, so a test that did not clear them would
    // pass or fail on the developer's local configuration.
    for (const key of BRANDING_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of BRANDING_KEYS) {
      if (saved[key] !== undefined) process.env[key] = saved[key]
      else delete process.env[key]
    }
  })

  it('reads nothing when the install has configured no label', () => {
    expect(readEmailFooterBranding()).toBeNull()
    // A URL on its own is not a line: there would be nothing to click.
    process.env.EMAIL_FOOTER_BRANDING_URL = URL
    expect(readEmailFooterBranding()).toBeNull()
  })

  it('links the configured label at the configured URL', () => {
    process.env.EMAIL_FOOTER_BRANDING_TEXT = LABEL
    process.env.EMAIL_FOOTER_BRANDING_URL = URL
    expect(readEmailFooterBranding()).toEqual({ label: LABEL, url: URL })
  })

  it('trims the operator-typed values and ignores blank ones', () => {
    process.env.EMAIL_FOOTER_BRANDING_TEXT = `  ${LABEL}  `
    process.env.EMAIL_FOOTER_BRANDING_URL = '   '
    expect(readEmailFooterBranding()).toEqual({ label: LABEL })
  })

  it('renders no branding line in a template when unconfigured', async () => {
    const html = await renderWelcome()
    expect(html).not.toContain(LABEL)
    // The name this replaced must not come back from a hardcoded fallback.
    expect(html).not.toContain('Powered by Quackback')
    expect(html).not.toContain('https://quackback.io"')
  })

  it('renders the configured line as a link in a template', async () => {
    process.env.EMAIL_FOOTER_BRANDING_TEXT = LABEL
    process.env.EMAIL_FOOTER_BRANDING_URL = URL
    const html = await renderWelcome()
    expect(html).toContain(LABEL)
    expect(html).toMatch(new RegExp(`<a[^>]*href="${URL}"[^>]*>[\\s\\S]*?${LABEL}`))
  })

  it('renders the label unlinked when no URL is configured', async () => {
    process.env.EMAIL_FOOTER_BRANDING_TEXT = LABEL
    const html = await renderWelcome()
    // The label is the whole content of the footer paragraph, with no anchor
    // between the two. Matched as one span rather than "html has no <a>": the
    // template's own call-to-action button is an anchor and stays one.
    expect(html).toMatch(new RegExp(`>${LABEL}</p>`))
    expect(html).not.toContain(URL)
  })

  it('stays out of a capability-free template even when configured', async () => {
    process.env.EMAIL_FOOTER_BRANDING_TEXT = LABEL
    process.env.EMAIL_FOOTER_BRANDING_URL = URL
    const html = await render(SignupNotAllowedEmail({ workspaceName: 'Acme' }))
    expect(html).not.toContain(LABEL)
    expect(html).not.toMatch(/<a\b/i)
  })
})
