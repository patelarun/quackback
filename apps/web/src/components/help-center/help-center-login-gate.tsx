/**
 * In-place login wall for a help center whose access setting is
 * `authenticated`.
 *
 * Deliberately NOT the full-screen `PortalAccessGate`: the Help tab stays in
 * the portal nav and the portal chrome stays on screen, so this renders only
 * inside the help-center outlet, as a centered card where the articles would
 * have been. A visitor can still see that documentation exists and where to
 * find it — they just have to sign in or sign up to read it.
 *
 * No article data ever reaches this component. The `/hc` route resolves the
 * gate before any help-center loader runs, and every public help-center read
 * fn independently refuses a gated caller, so there is nothing here to leak.
 */
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { FormattedMessage } from 'react-intl'
import { useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAuthPopover } from '@/components/auth/auth-popover-context'
import { useAuthBroadcast } from '@/lib/client/hooks/use-auth-broadcast'

interface HelpCenterLoginGateProps {
  /** Shown in the body copy so the ask reads as this workspace's, not ours. */
  workspaceName: string
}

export function HelpCenterLoginGate({ workspaceName }: HelpCenterLoginGateProps) {
  const { openAuthPopover } = useAuthPopover()
  const currentPath = useRouterState({ select: (s) => s.location.href })

  // A full document load, not `router.invalidate()`. The gate is resolved in
  // the /hc route's `beforeLoad`, whose result TanStack Router caches for an
  // already-loaded match across an invalidate — so an invalidate alone would
  // leave a just-signed-in visitor staring at this card. Reloading re-runs
  // beforeLoad from scratch and lands them on the articles.
  const reloadIntoHelpCenter = () => {
    window.location.assign(currentPath)
  }

  // Covers the sign-in paths that never return through the dialog's own
  // success callback: an OAuth popup, or a second tab.
  useAuthBroadcast({ onSuccess: reloadIntoHelpCenter })

  const promptSignIn = (mode: 'login' | 'signup') => {
    openAuthPopover({ mode, callbackUrl: currentPath, onSuccess: reloadIntoHelpCenter })
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <LockClosedIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          <FormattedMessage
            id="portal.hc.gate.title"
            defaultMessage="Log in to access the help center"
          />
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          <FormattedMessage
            id="portal.hc.gate.description"
            defaultMessage="{workspaceName} keeps its documentation for signed-in customers. Log in to read it, or create an account — it only takes a moment."
            values={{ workspaceName }}
          />
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button className="sm:min-w-32" onClick={() => promptSignIn('login')}>
            <FormattedMessage id="portal.hc.gate.logIn" defaultMessage="Log in" />
          </Button>
          <Button variant="outline" className="sm:min-w-32" onClick={() => promptSignIn('signup')}>
            <FormattedMessage id="portal.hc.gate.signUp" defaultMessage="Sign up" />
          </Button>
        </div>
      </div>
    </div>
  )
}
