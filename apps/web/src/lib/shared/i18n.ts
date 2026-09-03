/**
 * Last-resort UI locale. Used only when no visitor override, no workspace
 * default and no Accept-Language match produced a locale -- e.g. a request
 * with no Accept-Language header at all, or a surface that renders before
 * workspace settings are available. It is NOT "the language the product is
 * in": that is the workspace's `portalConfig.defaultLocale`, resolved by
 * {@link resolveCustomerFacingLocale}.
 */
export const FALLBACK_UI_LOCALE = 'en' as const

/**
 * Upstream's name for the same constant. This fork renamed it to
 * FALLBACK_UI_LOCALE so it cannot be mistaken for
 * {@link DEFAULT_WORKSPACE_LOCALE} ('sv' here) -- but upstream code keeps
 * importing `DEFAULT_LOCALE`, so the alias stays exported to keep every
 * upstream merge free of a mechanical rename across a dozen files.
 * Prefer FALLBACK_UI_LOCALE in fork-authored code.
 */
export const DEFAULT_LOCALE = FALLBACK_UI_LOCALE

export const SUPPORTED_LOCALES = [
  'en',
  'de',
  'fr',
  'es',
  'sv',
  'ar',
  'ru',
  'pt-br',
  'zh-cn',
  'zh-tw',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * The locale a workspace serves to visitors when it has no explicit
 * `portalConfig.defaultLocale` -- the shipped default for a fresh install.
 * Distinct from {@link FALLBACK_UI_LOCALE} (a last-resort for when resolution
 * produced nothing) and from the help center's base CONTENT locale
 * (`helpCenter.locales.default`, the language articles are authored in).
 */
export const DEFAULT_WORKSPACE_LOCALE: SupportedLocale = 'sv'

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

/**
 * Normalizes a locale string to a supported locale, stripping region subtags
 * and lowercasing. Returns null if the locale is not supported.
 */
export function normalizeLocale(locale: string): SupportedLocale | null {
  if (!locale) return null

  const lower = locale.toLowerCase()

  // Try exact match first
  if ((SUPPORTED_LOCALES as readonly string[]).includes(lower)) {
    return lower as SupportedLocale
  }

  // Strip region subtag (e.g. "fr-FR" -> "fr"), but only accept 2-letter base codes
  const parts = lower.split('-')

  // Chinese is script-sensitive: Simplified (zh-cn) and Traditional (zh-tw) are
  // separate catalogs, so the generic "strip to base" rule below would wrongly
  // collapse them to a non-existent "zh". Infer the script from CLDR's
  // likely-subtags data via Intl.Locale.maximize(): an explicit "Hant" script
  // or a Traditional region (TW/HK/MO, etc.) yields "Hant" → zh-tw; everything
  // else under "zh" (bare zh, Hans, CN, SG) maximizes to "Hans" → zh-cn.
  if (parts[0] === 'zh') {
    try {
      return new Intl.Locale(lower).maximize().script === 'Hant' ? 'zh-tw' : 'zh-cn'
    } catch {
      // Irregular tag Intl can't parse (e.g. "zh-min-nan") → Simplified default.
      return 'zh-cn'
    }
  }

  if (parts.length >= 2) {
    const base = parts[0]
    // Only treat as a locale if the base is a 2–3 letter code
    if (base.length >= 2 && base.length <= 3 && /^[a-z]+$/.test(base)) {
      if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
        return base as SupportedLocale
      }
    }
  }

  return null
}

/**
 * Parses an Accept-Language header and returns the best matching supported
 * locale. An explicit locale override takes precedence when supported.
 * Falls back to FALLBACK_UI_LOCALE if nothing matches.
 */
export function resolveLocale(
  acceptLanguage: string | null | undefined,
  explicitLocale?: string
): SupportedLocale {
  // Explicit locale wins if it's supported
  if (explicitLocale) {
    const normalized = normalizeLocale(explicitLocale)
    if (normalized !== null) return normalized
  }

  // Parse Accept-Language header
  if (!acceptLanguage) return FALLBACK_UI_LOCALE

  const entries = acceptLanguage
    .split(',')
    .map((entry) => {
      const [tag, qPart] = entry.trim().split(';')
      const q = qPart ? parseFloat(qPart.replace('q=', '').trim()) : 1.0
      return { tag: tag.trim(), q: isNaN(q) ? 1.0 : q }
    })
    // q=0 means "not acceptable" (RFC 7231), so drop those entries entirely.
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of entries) {
    const normalized = normalizeLocale(tag)
    if (normalized !== null) return normalized
  }

  return FALLBACK_UI_LOCALE
}

/**
 * Name of the cookie holding a visitor's explicit language choice, set by the
 * portal language switcher. Read on every customer-facing request, so it is
 * scoped to the whole site (not just `/hc`) and outlives the session.
 */
export const VISITOR_LOCALE_COOKIE = 'qb_locale'

/**
 * Read the visitor's explicit language choice out of a raw Cookie header.
 * Returns null when absent or unsupported, so callers fall through to the
 * workspace default.
 */
export function readVisitorLocaleCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null
  for (const cookie of cookieHeader.split(';')) {
    const [key, ...rest] = cookie.trim().split('=')
    if (key === VISITOR_LOCALE_COOKIE) return decodeURIComponent(rest.join('=')) || null
  }
  return null
}

/**
 * Persist the visitor's language choice from the browser. Site-wide path and
 * a one-year age: the pick should survive navigation out of the help center
 * and the end of the session.
 */
export function setVisitorLocaleCookie(locale: SupportedLocale): void {
  document.cookie = `${VISITOR_LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
}

/**
 * Resolve the locale for a CUSTOMER-FACING surface (portal, widget, help
 * center), in strict precedence order:
 *
 * 1. `visitorChoice` -- an explicit pick from the language switcher (cookie)
 *    or, on the widget, the `locale` init option the host page passed. A
 *    person who chose a language always keeps it.
 * 2. `workspaceDefault` -- the language this workspace serves. It deliberately
 *    OUTRANKS Accept-Language: a workspace that serves Swedish serves Swedish
 *    to an en-US browser too, which is the whole point of a default language.
 * 3. `acceptLanguage` -- browser preference, honored only by a workspace that
 *    configured no default of its own.
 * 4. {@link FALLBACK_UI_LOCALE}.
 *
 * Unsupported values at any step fall through to the next rather than
 * erroring, so a stale cookie or a typo'd init option degrades instead of
 * breaking the page.
 */
export function resolveCustomerFacingLocale(params: {
  visitorChoice?: string | null
  workspaceDefault?: string | null
  acceptLanguage?: string | null
}): SupportedLocale {
  const { visitorChoice, workspaceDefault, acceptLanguage } = params

  if (visitorChoice) {
    const chosen = normalizeLocale(visitorChoice)
    if (chosen !== null) return chosen
  }

  if (workspaceDefault) {
    const configured = normalizeLocale(workspaceDefault)
    if (configured !== null) return configured
  }

  return resolveLocale(acceptLanguage)
}

/**
 * Returns true if the given locale is written right-to-left.
 */
export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale.toLowerCase())
}

/**
 * Returns true if the `?rtl=1` debug query param is set.
 * Safe to call during SSR (returns false when `window` is unavailable).
 * Result is computed once and cached for the lifetime of the page.
 */
export const isRtlForced = (() => {
  let cached: boolean | undefined
  return (): boolean => {
    if (cached !== undefined) return cached
    cached =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('rtl') === '1'
    return cached
  }
})()

const messageCache = new Map<SupportedLocale, Promise<Record<string, string>>>()

/**
 * Dynamically imports the message catalog for the given locale.
 * Falls back to English on error (e.g. locale file doesn't exist yet).
 * Results are cached per locale for the lifetime of the page.
 */
export function loadMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  const cached = messageCache.get(locale)
  if (cached) return cached

  const promise = (async () => {
    try {
      const messages = await import(`../../locales/${locale}.json`)
      return messages.default as Record<string, string>
    } catch {
      // Locale catalog missing/unparseable — degrade to English rather than crash.
      const fallback = await import('../../locales/en.json')
      return fallback.default as Record<string, string>
    }
  })()

  messageCache.set(locale, promise)
  return promise
}

/**
 * Key prefixes the widget surface renders (widget views plus the shared
 * Ask-AI / ui / common strings they embed). Everything else in the catalog is
 * portal/admin copy the iframe never shows.
 */
const WIDGET_MESSAGE_PREFIXES = ['widget.', 'helpAskAi.', 'ui.', 'common.']

/**
 * The widget's slice of the message catalog. Loaded in the widget layout
 * loader (server-side) and serialized into loader data so the iframe's first
 * client render is already translated — the widget route is `ssr:
 * 'data-only'`, so without this seed the IntlProvider mounts empty, flashes
 * English defaults, and pays a post-mount catalog-chunk fetch. Filtering
 * keeps the serialized payload to the ~200 keys the widget can actually show.
 */
export async function loadWidgetMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  const all = await loadMessages(locale)
  const subset: Record<string, string> = {}
  for (const [key, value] of Object.entries(all)) {
    if (WIDGET_MESSAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) subset[key] = value
  }
  return subset
}

/**
 * Key prefixes the onboarding wizard renders. Ids authored under
 * `routes/onboarding` and `components/onboarding` live under `onboarding.`;
 * `portal.auth.` joins them because the account step renders the shared
 * sign-in form rather than a second copy of it, and those strings are
 * already translated. A unit test (onboarding-message-coverage.test.ts)
 * re-derives the ids from source and fails if one falls outside this list,
 * so a new key can't silently render its English fallback.
 */
const ONBOARDING_MESSAGE_PREFIXES = ['onboarding.', 'portal.auth.'] as const

/** The prefix allowlist as a plain string[], for tests and iteration. */
export const ONBOARDING_MESSAGE_PREFIX_LIST: readonly string[] = ONBOARDING_MESSAGE_PREFIXES

/**
 * The onboarding wizard's slice of the message catalog, loaded in the
 * `/onboarding` layout loader. Mirrors {@link loadPortalMessages} and
 * {@link loadWidgetMessages}: the wizard renders only `onboarding.` ids, so
 * seeding the whole (portal + admin + widget) catalog would add ~80KB to the
 * SSR document of the first screen a new workspace ever sees. Slicing keeps
 * that at the handful of keys the wizard can actually show, and the moment
 * translated onboarding copy lands in the catalogs it is picked up here with no
 * further change.
 */
export async function loadOnboardingMessages(
  locale: SupportedLocale
): Promise<Record<string, string>> {
  const all = await loadMessages(locale)
  const subset: Record<string, string> = {}
  for (const [key, value] of Object.entries(all)) {
    if (ONBOARDING_MESSAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) subset[key] = value
  }
  return subset
}

/**
 * Key prefixes the portal surfaces render. Derived from the transitive import
 * closure of the `_portal` route tree plus the standalone `/auth/*` pages and
 * the portal access gate — every react-intl id reachable from those pages
 * lives under one of these prefixes:
 *
 * - `portal.` — the bulk of portal/feedback/roadmap/tickets/help-center copy;
 * - `widget.` — the shared conversation-thread components (messenger/CSAT/
 *   assistant strings) reused on the portal support & ticket pages;
 * - `helpAskAi.` — the help-center Ask-AI search surface under `_portal/hc`;
 * - `ui.` — shared UI primitives (e.g. combobox) embedded in portal forms;
 * - `common.` — cross-surface strings (e.g. common.cancel) used on auth pages.
 *
 * Everything else in the catalog is admin/inbox copy the portal never renders.
 * A unit test (portal-message-coverage.test.ts) statically re-derives the ids
 * referenced by the portal source and fails CI if any fall outside this list,
 * so a future key can't silently render its English fallback in production.
 */
const PORTAL_MESSAGE_PREFIXES = ['portal.', 'widget.', 'helpAskAi.', 'ui.', 'common.'] as const

/** The prefix allowlist as a plain string[], for tests and iteration. */
export const PORTAL_MESSAGE_PREFIX_LIST: readonly string[] = PORTAL_MESSAGE_PREFIXES

/**
 * The portal's slice of the message catalog. Loaded in the portal layout loader
 * (server-side) and serialized into loader data so the portal's first render is
 * already translated during SSR. Mirrors {@link loadWidgetMessages}: filtering
 * to the portal prefixes keeps the serialized payload to the strings the portal
 * can actually show, instead of the whole (admin-inclusive) catalog — a large
 * chunk of the portal SSR HTML. See {@link PORTAL_MESSAGE_PREFIXES}.
 */
export async function loadPortalMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  const all = await loadMessages(locale)
  const subset: Record<string, string> = {}
  for (const [key, value] of Object.entries(all)) {
    if (PORTAL_MESSAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) subset[key] = value
  }
  return subset
}
