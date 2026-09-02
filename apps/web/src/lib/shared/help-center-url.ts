import { resolveLocale } from './i18n'

/**
 * Returns the base path for the inline help center.
 * The help center is always served inline at /hc on the workspace's main domain.
 */
export function getHelpCenterBaseUrl(): string {
  return '/hc'
}

/**
 * Prefix an /hc path with a locale segment unconditionally -- for callers that
 * already know they are inside a locale-prefixed subtree (the `/hc/$locale/*`
 * routes and the components rendered under them, which pass no locale at all
 * on base-locale pages). `path` must start with `/hc`.
 */
export function prefixHcPath(locale: string, path: string): string {
  if (path === '/hc') return `/hc/${locale}`
  return path.replace(/^\/hc/, `/hc/${locale}`)
}

/**
 * Build an /hc path for a given locale from its canonical (base-locale,
 * unprefixed) form -- domains/languages §2: `/hc/{locale}/...`, with the base
 * content locale staying unprefixed for URL stability.
 *
 * `baseLocale` is the workspace's configured help-center base locale
 * (`helpCenter.locales.default`), NOT the app's UI fallback: a workspace that
 * authors in Swedish serves Swedish on the unprefixed paths.
 */
export function localizedHcPath(locale: string, path: string, baseLocale: string): string {
  if (locale === baseLocale) return path
  return prefixHcPath(locale, path)
}

/**
 * Inverse of {@link localizedHcPath}: given an actual /hc/* pathname and the
 * set of enabled additional locales, recover which locale it's in and the
 * canonical (unprefixed) path. A first segment that isn't an enabled locale
 * is treated as base-locale content (so `/hc/categories/x` is never
 * mistaken for locale "categories").
 */
export function parseHcLocalePath(
  pathname: string,
  enabledLocales: string[],
  baseLocale: string
): { locale: string; canonicalPath: string } {
  const match = /^\/hc\/([^/]+)(\/.*)?$/.exec(pathname)
  if (match && enabledLocales.includes(match[1])) {
    return { locale: match[1], canonicalPath: `/hc${match[2] ?? ''}` }
  }
  return { locale: baseLocale, canonicalPath: pathname }
}

/**
 * Browser-detect + manual-override resolution for the bare `/hc` entry
 * point (domains/languages §2). A manual choice (the `hc_locale` cookie,
 * set by the switcher) always wins over Accept-Language, including an
 * explicit choice to stay on the default locale. First-time visitors with
 * no cookie fall back to Accept-Language detection. Returns null when the
 * visitor should stay on the default-locale homepage.
 */
export function resolveHcLandingLocale(params: {
  cookieLocale: string | null
  acceptLanguage: string | null
  enabledAdditionalLocales: string[]
  defaultLocale: string
}): string | null {
  const { cookieLocale, acceptLanguage, enabledAdditionalLocales, defaultLocale } = params
  if (enabledAdditionalLocales.length === 0) return null

  if (cookieLocale) {
    if (cookieLocale === defaultLocale) return null
    return enabledAdditionalLocales.includes(cookieLocale) ? cookieLocale : null
  }

  const detected = resolveLocale(acceptLanguage)
  if (detected !== defaultLocale && enabledAdditionalLocales.includes(detected)) {
    return detected
  }
  return null
}
