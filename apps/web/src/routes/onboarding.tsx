import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PortalIntlProvider } from '@/components/portal-intl-provider'
import { loadPortalIntl } from '@/lib/server/functions/locale'

/**
 * Parent route for onboarding - just renders children.
 * The index route handles redirection logic.
 *
 * The steps under _layout use react-intl (useIntl / FormattedMessage), so the
 * provider is mounted here rather than per step: with no IntlProvider ancestor,
 * useIntl() throws and the whole flow renders the error boundary
 * ("Could not find required `intl` object") instead of the account form.
 */
export const Route = createFileRoute('/onboarding')({
  loader: async () => await loadPortalIntl(),
  component: OnboardingRoot,
})

function OnboardingRoot() {
  const { locale, messages } = Route.useLoaderData()

  return (
    <PortalIntlProvider locale={locale} messages={messages}>
      <Outlet />
    </PortalIntlProvider>
  )
}
