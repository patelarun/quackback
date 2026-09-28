/**
 * Server functions for help-center access: evaluate whether the calling
 * request may read `/hc` content, and update the login-gate setting (admin
 * only).
 *
 * The help center is the one portal surface that historically had no auth
 * gate at all — every `*Public*Fn` in `help-center.ts` went straight to the
 * service layer while every other portal read fn ran
 * `resolvePortalAccessForRequest()` first. This module is that missing outer
 * gate, driven by `helpCenterConfig.access.visibility`.
 */
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { PERMISSIONS } from '@/lib/shared/permissions'
import { updateHelpCenterAccessSchema } from '@/lib/shared/schemas/help-center'
import { resolvePortalAccessForRequest } from './portal-access'
import { hasAuthCredentials, getOptionalAuth, policyActorFromAuth } from './auth-helpers'
import { logger } from '@/lib/server/logger'

const log = logger.child({ component: 'help-center-access' })

// ---------------------------------------------------------------------------
// Gate: evaluate the calling request's own help-center access
// ---------------------------------------------------------------------------

/**
 * The outcome of the help-center gate for one request.
 *
 * `public` — the workspace serves its help center to everyone.
 * `authenticated` — the gate is on and the caller is a real signed-in
 * principal.
 * `unauthenticated` — nobody is signed in.
 * `unauthorized` — somebody IS signed in, but they are not on the access
 * list for this private portal.
 *
 * `deniedBy` says which of the two gates refused. It matters to the `/hc`
 * route: a `help-center` denial is this module's own login wall to render,
 * while a `portal` denial belongs to `_portal.tsx`, which renders the
 * workspace-wide privacy wall and needs the requested URL left intact for
 * its post-sign-in callback.
 */
export type HelpCenterAccessDecision =
  | { granted: true; reason: 'public' | 'authenticated' }
  | {
      granted: false
      reason: 'unauthenticated' | 'unauthorized'
      deniedBy: 'portal' | 'help-center'
    }

/**
 * Resolve the help-center access decision for the CURRENT request.
 *
 * The shared, reusable core — NOT a `createServerFn`. Call it directly from
 * any server function or route handler that serves help-center content, so
 * the login gate is enforced at the data layer and not only on the page.
 *
 * The caller's identity is read entirely server-side from the request headers
 * (cookie session or widget Bearer token); a caller cannot supply their own.
 *
 * Never-throw contract, matching `resolvePortalAccessForRequest`:
 *
 *   - Portal gate denies → the help center denies with the same reason. A
 *     private portal always implies a private help center; the help-center
 *     setting can only ever narrow access further, never widen it.
 *
 *   - Help-center config unreadable because there is no settings row: fail
 *     OPEN to `public`, so a fresh un-onboarded install keeps working.
 *
 *   - Help-center config unreadable for any other reason (DB error, JSON
 *     parse, transient infra): fail CLOSED. A gated help center must never
 *     silently reopen on a transient error.
 *
 *   - Principal lookup fails: fail CLOSED (treated as signed out).
 */
export const resolveHelpCenterAccessForRequest = createServerOnlyFn(
  async (): Promise<HelpCenterAccessDecision> => {
    // Outer layer: the portal's own visibility gate. A workspace that made
    // its whole portal private has already decided the help center is
    // private too, whatever the help-center setting says.
    const portalDecision = await resolvePortalAccessForRequest()
    if (!portalDecision.granted) {
      return { granted: false, reason: portalDecision.reason, deniedBy: 'portal' }
    }

    let loginRequired: boolean
    try {
      const { getHelpCenterConfig } = await import('@/lib/server/domains/settings/settings.service')
      const helpCenterConfig = await getHelpCenterConfig()
      loginRequired = helpCenterConfig.access?.visibility === 'authenticated'
    } catch (err) {
      const { NotFoundError } = await import('@/lib/shared/errors')
      if (err instanceof NotFoundError) {
        // No settings row — un-onboarded install, treat as public.
        return { granted: true, reason: 'public' }
      }
      log.error({ err }, 'help center config unreadable, failing closed')
      return {
        granted: false,
        reason: hasAuthCredentials() ? 'unauthorized' : 'unauthenticated',
        deniedBy: 'help-center',
      }
    }

    if (!loginRequired) return { granted: true, reason: 'public' }

    // Header-only check first: a request carrying no session cookie and no
    // Bearer token is signed out, and skipping the DB round-trip keeps the
    // crawler/anonymous path cheap.
    if (!hasAuthCredentials()) {
      return { granted: false, reason: 'unauthenticated', deniedBy: 'help-center' }
    }

    let isRealPrincipal = false
    try {
      const viewer = await policyActorFromAuth(await getOptionalAuth())
      // An anonymous Better Auth session (the portal mints one for unsigned
      // voting) is NOT a sign-in and must not open the gate.
      isRealPrincipal = viewer.principalId !== null && viewer.principalType !== 'anonymous'
    } catch (err) {
      log.warn({ err }, 'principal lookup failed, failing closed')
      isRealPrincipal = false
    }

    return isRealPrincipal
      ? { granted: true, reason: 'authenticated' }
      : { granted: false, reason: 'unauthenticated', deniedBy: 'help-center' }
  }
)

/**
 * Whether the current request may read help-center content at all.
 *
 * The shorthand for list-shaped public reads, which return an empty result
 * rather than throwing so a gated help center degrades to "no articles"
 * instead of breaking the surface embedding them (the widget home, for one).
 */
export const helpCenterIsReadableForRequest = createServerOnlyFn(async (): Promise<boolean> => {
  const decision = await resolveHelpCenterAccessForRequest()
  return decision.granted
})

/**
 * Refuse a single-entity public read when the help center is gated.
 *
 * Throws `NotFoundError` rather than a 403: a gated help center must not
 * confirm which article or collection slugs exist, and every caller of these
 * fns already renders a 404 for a missing entity.
 */
export const assertHelpCenterReadable = createServerOnlyFn(async (): Promise<void> => {
  const decision = await resolveHelpCenterAccessForRequest()
  if (decision.granted) return
  const { NotFoundError } = await import('@/lib/shared/errors')
  throw new NotFoundError('HELP_CENTER_NOT_FOUND', 'Help center not found')
})

/**
 * Evaluate the calling request's help-center access as an RPC.
 *
 * Thin `createServerFn` wrapper so route loaders can call it. The response
 * carries ONLY the decision — never the config that produced it.
 */
export const evaluateMyHelpCenterAccessFn = createServerFn({ method: 'GET' }).handler(async () => {
  return resolveHelpCenterAccessForRequest()
})

// ---------------------------------------------------------------------------
// Admin: flip the login gate
// ---------------------------------------------------------------------------

/**
 * Turn the help-center login gate on or off. Admin-only, and audited —
 * flipping a public knowledge base to customers-only (or back) is exactly
 * the kind of change a compliance reviewer needs to see attributed.
 */
export const updateHelpCenterAccessFn = createServerFn({ method: 'POST' })
  .validator(updateHelpCenterAccessSchema)
  .handler(async ({ data }) => {
    const [{ requireAuth }, { getRequestHeaders }, { actorFromAuth, recordAuditEvent }] =
      await Promise.all([
        import('./auth-helpers'),
        import('@tanstack/react-start/server'),
        import('@/lib/server/audit/log'),
      ])
    const auth = await requireAuth({ permission: PERMISSIONS.HELP_CENTER_MANAGE })

    const { getHelpCenterConfig, updateHelpCenterConfig } =
      await import('@/lib/server/domains/settings/settings.service')
    const before = await getHelpCenterConfig()
    const previousVisibility = before.access?.visibility ?? 'public'

    const updated = await updateHelpCenterConfig({ access: { visibility: data.visibility } })

    if (previousVisibility !== data.visibility) {
      log.info({ visibility: data.visibility }, 'help center visibility changed')
      await recordAuditEvent({
        event: 'help_center.visibility.changed',
        actor: actorFromAuth(auth),
        headers: getRequestHeaders(),
        target: { type: 'settings', id: 'help_center_config' },
        before: { visibility: previousVisibility },
        after: { visibility: data.visibility },
      })
    }

    return updated
  })
