import { DEFAULT_LOCALE, resolveLocale } from './i18n'

/**
 * Returns the base path for the inline help center.
 * The help center is always served inline at /hc on the workspace's main domain.
 */
export function getHelpCenterBaseUrl(): string {
  return '/hc'
}

/**
 * Join a public numeric id and slug as `{urlId}-{slug}`.
 */
export function formatHcIdSlug(urlId: number, slug: string): string {
  const trimmed = slug.replace(/^-+|-+$/g, '')
  return trimmed ? `${urlId}-${trimmed}` : String(urlId)
}

/**
 * Split an `{urlId}-{slug}` path param. Returns null for a legacy category
 * slug like `getting-started`.
 */
export function parseHcIdSlug(param: string): { urlId: number; slug: string } | null {
  const hyphen = param.indexOf('-')
  const key = hyphen === -1 ? param : param.slice(0, hyphen)
  if (!/^[1-9]\d*$/.test(key)) return null
  const urlId = Number(key)
  if (!Number.isSafeInteger(urlId)) return null
  return { urlId, slug: hyphen === -1 ? '' : param.slice(hyphen + 1) }
}

/** Public article URL: `/hc/{locale}/articles/{urlId}-{slug}`. */
export function hcArticlePath(opts: { locale: string; urlId: number; slug: string }): string {
  return `/hc/${opts.locale}/articles/${formatHcIdSlug(opts.urlId, opts.slug)}`
}

/** Public collection URL: `/hc/{locale}/collections/{urlId}-{slug}`. */
export function hcCollectionPath(opts: { locale: string; urlId: number; slug: string }): string {
  return `/hc/${opts.locale}/collections/${formatHcIdSlug(opts.urlId, opts.slug)}`
}

/**
 * Build an /hc path for a given locale from its canonical (unprefixed) form.
 * The homepage stays unprefixed for the base locale (`/hc`); every other
 * path — including base-locale articles and collections — carries the
 * locale (`/hc/en/articles/...`).
 *
 * `baseLocale` is the workspace's configured help-center base locale
 * (`helpCenter.locales.default`), NOT the app's UI fallback: a workspace that
 * authors in Swedish serves Swedish on the unprefixed homepage. It defaults to
 * DEFAULT_LOCALE so upstream's two-argument call sites keep their behaviour.
 */
export function localizedHcPath(
  locale: string,
  path: string,
  baseLocale: string = DEFAULT_LOCALE
): string {
  const isHome = path === '/hc' || path === '/hc/'
  if (isHome) return locale === baseLocale ? '/hc' : `/hc/${locale}`
  const rest = path.replace(/^\/hc/, '')
  return `/hc/${locale}${rest}`
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
  baseLocale: string = DEFAULT_LOCALE
): { locale: string; canonicalPath: string } {
  const match = /^\/hc\/([^/]+)(\/.*)?$/.exec(pathname)
  if (match && enabledLocales.includes(match[1])) {
    return { locale: match[1], canonicalPath: `/hc${match[2] ?? ''}` }
  }
  return { locale: baseLocale, canonicalPath: pathname }
}

/**
 * Which locale the bare `/hc` entry point should send a visitor to
 * (domains/languages §2). Returns null when they should stay on the
 * unprefixed, base-content homepage.
 *
 * The two locales in play here are deliberately different things, and a
 * workspace can serve one language while authoring in another:
 *
 * - `baseContentLocale` is the language ARTICLES ARE WRITTEN IN. It owns the
 *   unprefixed `/hc/...` URLs. For a help center synced from an English
 *   source of truth, this stays `en` no matter what visitors are shown.
 * - `workspaceDefaultLocale` is the language VISITORS ARE SERVED. When it is
 *   an enabled additional locale, a first-time visitor is sent to its
 *   translated subtree rather than to the base-language homepage.
 *
 * Precedence: an explicit choice first (the `hc_locale` cookie from the
 * help-center switcher, then the site-wide `qb_locale` from the portal
 * language menu -- either may deliberately choose the base language and stay),
 * then the workspace default, then Accept-Language.
 */
export function resolveHcLandingLocale(params: {
  cookieLocale: string | null
  visitorLocale?: string | null
  workspaceDefaultLocale?: string | null
  acceptLanguage: string | null
  enabledAdditionalLocales: string[]
  baseContentLocale: string
}): string | null {
  const {
    cookieLocale,
    visitorLocale,
    workspaceDefaultLocale,
    acceptLanguage,
    enabledAdditionalLocales,
    baseContentLocale,
  } = params
  if (enabledAdditionalLocales.length === 0) return null

  /** A locale is only worth redirecting to when it has translations to show. */
  const redirectTargetFor = (locale: string): string | null =>
    locale === baseContentLocale || !enabledAdditionalLocales.includes(locale) ? null : locale

  // An explicit pick is final in both directions -- including a pick of the
  // base language, which must not be overridden by the workspace default.
  const explicitChoice = cookieLocale ?? visitorLocale
  if (explicitChoice) return redirectTargetFor(explicitChoice)

  if (workspaceDefaultLocale) return redirectTargetFor(workspaceDefaultLocale)

  return redirectTargetFor(resolveLocale(acceptLanguage))
}
