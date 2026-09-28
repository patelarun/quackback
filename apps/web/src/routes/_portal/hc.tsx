import { createFileRoute, notFound, redirect, Outlet, useRouterState } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { resolveHelpCenterDomainRedirect } from '@/lib/shared/help-center-domain'
import { HelpCenterLocaleSwitcher } from '@/components/help-center/help-center-locale-switcher'
import { HelpCenterLoginGate } from '@/components/help-center/help-center-login-gate'
import { parseHcLocalePath } from '@/lib/shared/help-center-url'
import { isRtlLocale } from '@/lib/shared/i18n'
import type { FeatureFlags, HelpCenterConfig } from '@/lib/shared/types/settings'
import { setPublicDocumentCacheHeaders } from '@/lib/server/functions/public-cache'
import { evaluateMyHelpCenterAccessFn } from '@/lib/server/functions/help-center-access'

/**
 * Only meaningful during SSR -- request headers aren't available on the
 * client, and a client-side nav that's already on the right host has
 * nothing to redirect. The isomorphic split keeps the server-only header
 * import out of the client bundle (import-protection denies it there);
 * swallow failures rather than block the page.
 */
const currentRequestHost = createIsomorphicFn()
  .client((): string | null => null)
  .server((): string | null => {
    try {
      return getRequestHeaders().get('host')
    } catch {
      return null
    }
  })

export const Route = createFileRoute('/_portal/hc')({
  beforeLoad: async ({ context, location }) => {
    const { settings } = context

    const flags = settings?.featureFlags as FeatureFlags | undefined
    if (!flags?.helpCenter) throw notFound()

    const helpCenterConfig = settings?.helpCenterConfig as HelpCenterConfig | undefined

    // Full-coverage 301: every /hc/* route is nested under this layout, so
    // this is the single place the default-host -> verified-custom-domain
    // redirect needs to live (domains/languages §1).
    const currentHost = currentRequestHost()
    const target = resolveHelpCenterDomainRedirect({
      domainConfig: helpCenterConfig?.domain,
      currentHost,
      pathname: location.pathname,
      // `searchStr` already includes the leading `?` when non-empty.
      search: location.searchStr ?? '',
    })
    if (target) throw redirect({ href: target, statusCode: 301 })

    // Login gate (help-center access setting). Resolved here, ahead of every
    // child route, because a gated visitor must not reach a single
    // help-center loader or slug-resolving redirect shim below this layout.
    //
    // A help-center denial collapses deep paths to /hc: the login card is one
    // card with nothing article-specific on it, so there is no reason to
    // render it at twelve different URLs. /hc itself does not redirect — it
    // renders the card from the loader below, which serves the wall as a 200,
    // the right status for a login screen and not the 500 a throw here would
    // force.
    //
    // A PORTAL denial is left exactly where it is. _portal.tsx renders the
    // workspace-wide privacy wall over this route and threads the requested
    // URL into its sign-in callback; collapsing to /hc would throw that away.
    const helpCenterAccess = await evaluateMyHelpCenterAccessFn()
    const gatedByHelpCenter =
      !helpCenterAccess.granted && helpCenterAccess.deniedBy === 'help-center'
    if (gatedByHelpCenter && normalizeHelpCenterPath(location.pathname) !== '/hc') {
      throw redirect({ to: '/hc', replace: true })
    }
    return { helpCenterAccess }
  },
  loader: async ({ context }) => {
    const { settings } = context
    const helpCenterConfig = (settings?.helpCenterConfig as HelpCenterConfig | null) ?? null

    // Re-resolved here rather than read from beforeLoad's context on purpose:
    // router.invalidate() re-runs loaders but reuses a loaded match's
    // beforeLoad result, so only a loader-resolved decision clears the gate
    // the instant a visitor signs in. Same reasoning as the portal gate in
    // _portal.tsx.
    const helpCenterAccess = await evaluateMyHelpCenterAccessFn()
    const loginRequired = !helpCenterAccess.granted

    // Never hand a shared cache the login wall, and never let a gated help
    // center be served from an entry cached while it was still public.
    if (typeof window === 'undefined' && !loginRequired) await setPublicDocumentCacheHeaders()

    return {
      helpCenterConfig,
      loginRequired,
      workspaceName: settings?.name ?? '',
    }
  },
  head: ({ loaderData }) => {
    // A gated help center is noindex whatever the SEO toggle says — there is
    // nothing behind the wall a crawler could ever reach.
    const indexable =
      !loaderData?.loginRequired && loaderData?.helpCenterConfig?.seo?.indexable !== false
    return {
      meta: indexable ? [] : [{ name: 'robots', content: 'noindex, nofollow' }],
    }
  },
  component: HelpCenterLayoutRoute,
})

/** `/hc`, `/hc/` and `/hc?x=1` are all the help-center root. */
function normalizeHelpCenterPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

function HelpCenterLayoutRoute() {
  const { helpCenterConfig, loginRequired, workspaceName } = Route.useLoaderData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const additionalLocales = helpCenterConfig?.locales?.additional ?? []
  const defaultLocale = helpCenterConfig?.locales?.default ?? 'en'
  const { locale, canonicalPath } = parseHcLocalePath(
    pathname,
    [defaultLocale, ...additionalLocales],
    defaultLocale
  )

  // Gated: the card replaces the whole help-center outlet. The locale
  // switcher goes with it — which locale the articles are in is not a
  // question worth answering to someone who cannot read them.
  if (loginRequired) {
    return <HelpCenterLoginGate workspaceName={workspaceName} />
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col" dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}>
      {additionalLocales.length > 0 && (
        <div className="flex justify-end px-4 py-2 sm:px-6">
          <HelpCenterLocaleSwitcher
            currentLocale={locale}
            defaultLocale={defaultLocale}
            additionalLocales={additionalLocales}
            canonicalPath={canonicalPath}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
