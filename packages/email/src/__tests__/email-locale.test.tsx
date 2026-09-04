/**
 * `EMAIL_LOCALE` decides the language every outgoing email is written in.
 *
 * The package had no i18n before, so the risk this guards is not a wrong
 * translation — it is a half-applied one: a template still holding an English
 * literal, or a key present in `en` and missing from `sv`. The sweep at the
 * bottom is the real assertion; the per-surface cases above it are there to say
 * which surface broke when it does.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@react-email/components'
import { en } from '../messages/en'
import { sv } from '../messages/sv'
import { emailLocale, emailText, FALLBACK_EMAIL_LOCALE } from '../messages'
import { conversationMessageCopy } from '../conversation-copy'
import { MagicLinkEmail } from '../templates/magic-link'
import { WelcomeEmail } from '../templates/welcome'
import { ConversationMessageEmail } from '../templates/conversation-message'

const saved: { value: string | undefined } = { value: undefined }

beforeEach(() => {
  saved.value = process.env.EMAIL_LOCALE
})
afterEach(() => {
  if (saved.value === undefined) delete process.env.EMAIL_LOCALE
  else process.env.EMAIL_LOCALE = saved.value
})

describe('locale selection', () => {
  it('falls back to English when unset', () => {
    delete process.env.EMAIL_LOCALE
    expect(emailLocale()).toBe(FALLBACK_EMAIL_LOCALE)
    expect(emailText('conversation.cta.viewConversation')).toBe('View conversation')
  })

  it('falls back to English for a locale the package does not carry', () => {
    process.env.EMAIL_LOCALE = 'kl'
    expect(emailLocale()).toBe('en')
  })

  it('accepts the configured locale regardless of case or padding', () => {
    process.env.EMAIL_LOCALE = '  SV '
    expect(emailLocale()).toBe('sv')
    expect(emailText('conversation.cta.viewConversation')).toBe('Visa konversationen')
  })

  it('substitutes parameters, and leaves an unsupplied one visible', () => {
    process.env.EMAIL_LOCALE = 'sv'
    expect(
      emailText('conversation.subject.newReply', { workspaceName: 'Bokning och Schema' })
    ).toBe('Nytt svar från Bokning och Schema')
    expect(emailText('conversation.subject.newReply')).toContain('{workspaceName}')
  })
})

describe('Swedish reaches the rendered mail', () => {
  beforeEach(() => {
    process.env.EMAIL_LOCALE = 'sv'
  })

  it('writes the conversation copy the senders build', () => {
    const copy = conversationMessageCopy({
      direction: 'agent_started',
      senderName: 'Bird Vision AB',
      workspaceName: 'Bokning och Schema',
    })
    expect(copy.subject).toBe('Nytt meddelande från Bokning och Schema')
    expect(copy.intro).toBe(
      'Bird Vision AB från Bokning och Schema har skickat ett meddelande till dig.'
    )
    expect(copy.ctaLabel).toBe('Visa konversationen')
    expect(copy.reason).toBe(
      'Du får det här mejlet eftersom Bokning och Schema har skickat ett meddelande till dig.'
    )
  })

  it('writes the conversation template around that copy', async () => {
    const copy = conversationMessageCopy({
      direction: 'agent_started',
      senderName: 'Bird Vision AB',
      workspaceName: 'Bokning och Schema',
    })
    const html = await render(
      ConversationMessageEmail({
        heading: copy.heading,
        intro: copy.intro,
        senderName: 'Bird Vision AB',
        messagePreview: 'Hej!',
        ctaUrl: 'https://example.com/c/1',
        ctaLabel: copy.ctaLabel,
        organizationName: 'Bokning och Schema',
        reason: copy.reason,
      })
    )
    expect(html).toContain('Visa konversationen')
    expect(html).not.toContain('View conversation')
    expect(html).not.toContain('You received this email')
  })

  it('writes the sign-in mail, which carries no English at all', async () => {
    const html = await render(
      MagicLinkEmail({ signInUrl: 'https://example.com/verify', code: '123456' })
    )
    expect(html).toContain('Logga in')
    expect(html).toContain('Länken och koden går ut om 10 minuter.')
    for (const english of [
      'Sign in to Quackback',
      'Click the button below',
      'Or enter this code',
      'expire in 10 minutes',
      'safely ignore this email',
    ]) {
      expect(html).not.toContain(english)
    }
  })

  it('writes the welcome mail, feature list included', async () => {
    const html = await render(
      WelcomeEmail({
        name: 'Ada',
        workspaceName: 'Bokning och Schema',
        dashboardUrl: 'https://example.com/dashboard',
      })
    )
    expect(html).toContain('Skapa feedbacktavlor')
    expect(html).toContain('Gå till kontrollpanelen')
    expect(html).not.toContain('Welcome to Quackback!')
    expect(html).not.toContain('Go to Dashboard')
  })
})

describe('the catalogues stay in step', () => {
  it('translates every English key, with no extras', () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort())
  })

  it('leaves no Swedish entry still holding the English wording', () => {
    // A handful of strings are legitimately identical across the two — proper
    // nouns, punctuation-only formats, and "Feedback", which Swedish borrows.
    const sharedByDesign = new Set([
      'common.label.feedback',
      'newSignIn.label.ip',
      'statusIncident.preview',
    ])
    const untranslated = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => !sharedByDesign.has(key) && sv[key] === en[key]
    )
    expect(untranslated).toEqual([])
  })

  it('keeps each translation on the same placeholder set as its English original', () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    const drifted = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => names(sv[key]).join() !== names(en[key]).join()
    )
    expect(drifted).toEqual([])
  })
})
