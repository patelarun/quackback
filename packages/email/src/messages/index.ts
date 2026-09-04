/**
 * The language outgoing email is written in.
 *
 * The package had no i18n at all: every subject, heading and footer line was an
 * English literal sitting in the sender or the template. These catalogues are
 * that copy lifted out, keyed, and looked up at send time, so an install picks
 * its language with `EMAIL_LOCALE` instead of a patch.
 *
 * One language per install, not one per recipient. A send happens in a
 * background job with no request behind it — no cookie, no Accept-Language, no
 * signed-in user — so there is no recipient locale to read at that moment. The
 * shape here is deliberately the half that does not need one: callers ask for a
 * key, and the resolver decides the language. Threading a per-recipient locale
 * through later means giving `emailMessages()` an argument, not rewriting the
 * ~130 call sites that this module exists to serve.
 *
 * English is the fallback and the source of truth for the key set: `sv` is
 * typed against it, so a key added here without a Swedish translation fails to
 * compile rather than silently emitting English to a Swedish reader.
 */
import { en } from './en'
import { sv } from './sv'

export type EmailMessageKey = keyof typeof en
export type EmailCatalogue = Record<EmailMessageKey, string>

/** Read-only lookup table — never mutated, so not module state under §4.4. */
const CATALOGUES: Record<string, EmailCatalogue> = { en, sv }

/** The language used when `EMAIL_LOCALE` is unset or names one we don't carry. */
export const FALLBACK_EMAIL_LOCALE = 'en'

/** Locales this package can actually write, for the operator-facing error path. */
export const SUPPORTED_EMAIL_LOCALES = Object.keys(CATALOGUES)

/**
 * The configured language, or the fallback.
 *
 * Read from the environment on every call for the same reason `getEnv` in
 * ../index exists: a module-load read lets Vite inline the value at build time.
 */
export function emailLocale(): string {
  const configured = process.env['EMAIL_LOCALE']?.trim().toLowerCase()
  if (configured && Object.hasOwn(CATALOGUES, configured)) return configured
  return FALLBACK_EMAIL_LOCALE
}

/** Substitute `{name}` placeholders; an unknown name is left visible, not blanked. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder
  )
}

/** Translate one key in the configured language. */
export function emailText(key: EmailMessageKey, params?: Record<string, string | number>): string {
  const catalogue = CATALOGUES[emailLocale()] ?? en
  // The `?? en[key]` is the seam for a partially translated catalogue that
  // slipped past the type check (a cast, a hand-edited JSON import).
  return interpolate(catalogue[key] ?? en[key], params)
}
