import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  loadPortalMessages,
  readVisitorLocaleCookie,
  resolveCustomerFacingLocale,
  type SupportedLocale,
} from '@/lib/shared/i18n'

/**
 * Resolve the locale for the portal and the standalone `/auth/*` routes.
 *
 * Precedence is the customer-facing chain (see `resolveCustomerFacingLocale`):
 * the visitor's own switcher choice, then the workspace's configured default
 * language, then Accept-Language. The workspace default deliberately outranks
 * the browser -- a workspace that serves Swedish serves it to an en-US browser
 * too -- so the switcher cookie is the only way a visitor overrides it.
 *
 * Also used by `/auth/*` so their forms render under the same
 * `PortalIntlProvider` the in-portal pages get from `_portal.tsx`.
 */
export const getPortalLocaleFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const { getPortalConfig } = await import('@/lib/server/domains/settings/settings.service')
  const headers = getRequestHeaders()

  // A workspace with no settings row yet (fresh install, first request) must
  // still render, so a config read failure degrades to browser detection
  // rather than 500ing the portal shell.
  const workspaceDefault = await getPortalConfig()
    .then((config) => config.defaultLocale ?? null)
    .catch(() => null)

  return resolveCustomerFacingLocale({
    visitorChoice: readVisitorLocaleCookie(headers.get('cookie')),
    workspaceDefault,
    acceptLanguage: headers.get('accept-language'),
  })
})

/**
 * Resolve the locale AND load its catalog for a route loader, so the page
 * renders translated during SSR (and hydrates from the same catalog) instead
 * of flashing the fallback language until the client fetches the messages.
 *
 * `loadPortalMessages` runs wherever the loader runs: server-side during SSR,
 * and client-side (cached, code-split chunk) on client navigation — only the
 * small locale lookup is ever an RPC. It returns just the portal slice of the
 * catalog (see PORTAL_MESSAGE_PREFIXES), so the SSR HTML doesn't carry the
 * admin/inbox strings the portal never renders.
 */
export async function loadPortalIntl(): Promise<{
  locale: SupportedLocale
  messages: Record<string, string>
}> {
  const locale = await getPortalLocaleFn()
  const messages = await loadPortalMessages(locale)
  return { locale, messages }
}

/**
 * Resolve the widget locale on the server so SSR and hydration agree.
 *
 * Precedence matches the rest of the customer-facing surfaces: the host page's
 * `?locale=` init option or the visitor's own switcher choice first, then the
 * workspace's configured default language, then Accept-Language. All of it is
 * read server-side because navigator/URL access during render would diverge
 * from SSR and trigger React hydration error #418 (issue #133).
 *
 * Lives here rather than in `routes/widget.tsx` because route files are
 * client-bundled: reaching into `settings.service` from one trips the
 * `no-restricted-imports` policy.
 */
export const getWidgetLocaleFn = createServerFn({ method: 'GET' })
  .validator(z.object({ explicitLocale: z.string().optional() }))
  .handler(async ({ data }) => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    const { getPortalConfig } = await import('@/lib/server/domains/settings/settings.service')
    const headers = getRequestHeaders()
    const workspaceDefault = await getPortalConfig()
      .then((config) => config.defaultLocale ?? null)
      .catch(() => null)

    return resolveCustomerFacingLocale({
      // The host page's explicit option outranks the visitor cookie: an
      // embedder that pins a language means it for that embed.
      visitorChoice: data.explicitLocale ?? readVisitorLocaleCookie(headers.get('cookie')),
      workspaceDefault,
      acceptLanguage: headers.get('accept-language'),
    })
  })
