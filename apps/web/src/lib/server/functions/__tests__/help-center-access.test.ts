/**
 * Tests for the help-center login gate (help-center-access.ts):
 *   - resolveHelpCenterAccessForRequest: the decision table, including the
 *     portal gate taking precedence and the fail-open/fail-closed split.
 *   - assertHelpCenterReadable / helpCenterIsReadableForRequest: the two
 *     shapes public reads use to refuse a gated caller.
 *   - updateHelpCenterAccessFn: admin gate and the audit event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError } from '@/lib/shared/errors'

type AnyHandler = (args: { data: Record<string, unknown> }) => Promise<unknown>

const handlers: AnyHandler[] = []

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator() {
        return chain
      },
      handler(fn: AnyHandler) {
        handlers.push(fn)
        return chain
      },
    }
    return chain
  },
  // The resolver and its two helpers are wrapped in createServerOnlyFn — the
  // mock hands back the inner function so they stay directly callable.
  createServerOnlyFn: <T>(fn: T) => fn,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => new Headers(),
}))

const hoisted = vi.hoisted(() => ({
  mockResolvePortalAccess: vi.fn(),
  mockHasAuthCredentials: vi.fn(),
  mockGetOptionalAuth: vi.fn(),
  mockPolicyActorFromAuth: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockGetHelpCenterConfig: vi.fn(),
  mockUpdateHelpCenterConfig: vi.fn(),
  mockRecordAuditEvent: vi.fn(),
}))

vi.mock('@/lib/server/functions/portal-access', () => ({
  resolvePortalAccessForRequest: hoisted.mockResolvePortalAccess,
}))

vi.mock('@/lib/server/functions/auth-helpers', () => ({
  hasAuthCredentials: hoisted.mockHasAuthCredentials,
  getOptionalAuth: hoisted.mockGetOptionalAuth,
  policyActorFromAuth: hoisted.mockPolicyActorFromAuth,
  requireAuth: hoisted.mockRequireAuth,
}))

vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  getHelpCenterConfig: hoisted.mockGetHelpCenterConfig,
  updateHelpCenterConfig: hoisted.mockUpdateHelpCenterConfig,
}))

vi.mock('@/lib/server/audit/log', () => ({
  recordAuditEvent: hoisted.mockRecordAuditEvent,
  actorFromAuth: (auth: { user: { id: string; email: string }; principal: { role: string } }) => ({
    userId: auth.user.id,
    email: auth.user.email,
    role: auth.principal.role,
  }),
}))

// Handler registration order in help-center-access.ts:
//   0  evaluateMyHelpCenterAccessFn  — .handler(...)
//   1  updateHelpCenterAccessFn      — .validator(...).handler(...)
const UPDATE_HELP_CENTER_ACCESS = 1

type AccessModule = typeof import('../help-center-access')

let accessModule: AccessModule
let updateHelpCenterAccessHandler: AnyHandler

const ADMIN_AUTH = {
  user: { id: 'user_admin', email: 'admin@acme.com', name: 'Admin' },
  principal: { id: 'principal_admin', role: 'admin', type: 'user' },
  settings: { id: 'ws_1', slug: 'acme', name: 'Acme', logoKey: null },
}

const SIGNED_IN_ACTOR = {
  principalId: 'principal_customer',
  role: 'user',
  principalType: 'user',
  segmentIds: new Set<string>(),
}

const ANONYMOUS_SESSION_ACTOR = {
  principalId: 'principal_anon',
  role: null,
  principalType: 'anonymous',
  segmentIds: new Set<string>(),
}

/** The default happy path: portal open, help center public, nobody signed in. */
function givenPublicHelpCenter() {
  hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
  hoisted.mockGetHelpCenterConfig.mockResolvedValue({ access: { visibility: 'public' } })
  hoisted.mockHasAuthCredentials.mockReturnValue(false)
}

function givenGatedHelpCenter() {
  hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
  hoisted.mockGetHelpCenterConfig.mockResolvedValue({ access: { visibility: 'authenticated' } })
}

// Imported exactly once, never through vi.resetModules(): a reset would give
// the module under test its own copy of @/lib/shared/errors, and the
// `err instanceof NotFoundError` branch inside it would stop matching the
// NotFoundError this file constructs.
beforeEach(async () => {
  vi.clearAllMocks()
  if (handlers.length === 0) {
    accessModule = await import('../help-center-access')
  }
  updateHelpCenterAccessHandler = handlers[UPDATE_HELP_CENTER_ACCESS]
})

// ---------------------------------------------------------------------------
// The decision table
// ---------------------------------------------------------------------------

describe('resolveHelpCenterAccessForRequest', () => {
  it('grants an anonymous visitor when the help center is public', async () => {
    givenPublicHelpCenter()

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: true,
      reason: 'public',
    })
  })

  it('never reads the help-center config when the portal gate already denied', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'help-center',
    })

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'portal',
    })
    expect(hoisted.mockGetHelpCenterConfig).not.toHaveBeenCalled()
  })

  it('carries the portal gate reason through for a signed-in but unauthorized visitor', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: false, reason: 'unauthorized' })

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthorized',
      deniedBy: 'portal',
    })
  })

  it('denies an anonymous visitor when the gate is on, without touching the DB', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(false)

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'help-center',
    })
    expect(hoisted.mockGetOptionalAuth).not.toHaveBeenCalled()
  })

  it('grants a signed-in customer when the gate is on', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(true)
    hoisted.mockGetOptionalAuth.mockResolvedValue({ principal: { id: 'principal_customer' } })
    hoisted.mockPolicyActorFromAuth.mockResolvedValue(SIGNED_IN_ACTOR)

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: true,
      reason: 'authenticated',
    })
  })

  it('does not count an anonymous portal session as a sign-in', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(true)
    hoisted.mockGetOptionalAuth.mockResolvedValue({ principal: { id: 'principal_anon' } })
    hoisted.mockPolicyActorFromAuth.mockResolvedValue(ANONYMOUS_SESSION_ACTOR)

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'help-center',
    })
  })

  it('fails closed when the principal lookup throws', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(true)
    hoisted.mockGetOptionalAuth.mockRejectedValue(new Error('db down'))

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'help-center',
    })
  })

  it('fails OPEN to public when there is no settings row yet', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
    hoisted.mockGetHelpCenterConfig.mockRejectedValue(
      new NotFoundError('SETTINGS_NOT_FOUND', 'Settings not found')
    )

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: true,
      reason: 'public',
    })
  })

  it('fails CLOSED when the help-center config is unreadable for any other reason', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
    hoisted.mockGetHelpCenterConfig.mockRejectedValue(new Error('redis exploded'))
    hoisted.mockHasAuthCredentials.mockReturnValue(false)

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthenticated',
      deniedBy: 'help-center',
    })
  })

  it('reports a signed-in caller as unauthorized when the config is unreadable', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
    hoisted.mockGetHelpCenterConfig.mockRejectedValue(new Error('redis exploded'))
    hoisted.mockHasAuthCredentials.mockReturnValue(true)

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: false,
      reason: 'unauthorized',
      deniedBy: 'help-center',
    })
  })

  it('treats a config with no access key as public (pre-upgrade rows)', async () => {
    hoisted.mockResolvePortalAccess.mockResolvedValue({ granted: true, reason: 'public' })
    hoisted.mockGetHelpCenterConfig.mockResolvedValue({ homepageTitle: 'How can we help?' })

    await expect(accessModule.resolveHelpCenterAccessForRequest()).resolves.toEqual({
      granted: true,
      reason: 'public',
    })
  })
})

// ---------------------------------------------------------------------------
// The two shapes public reads use
// ---------------------------------------------------------------------------

describe('helpCenterIsReadableForRequest', () => {
  it('is true for a public help center', async () => {
    givenPublicHelpCenter()
    await expect(accessModule.helpCenterIsReadableForRequest()).resolves.toBe(true)
  })

  it('is false for an anonymous visitor behind the gate', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(false)
    await expect(accessModule.helpCenterIsReadableForRequest()).resolves.toBe(false)
  })
})

describe('assertHelpCenterReadable', () => {
  it('resolves for a public help center', async () => {
    givenPublicHelpCenter()
    await expect(accessModule.assertHelpCenterReadable()).resolves.toBeUndefined()
  })

  it('throws NotFound — never a 403 — so gated slugs are not confirmed', async () => {
    givenGatedHelpCenter()
    hoisted.mockHasAuthCredentials.mockReturnValue(false)

    await expect(accessModule.assertHelpCenterReadable()).rejects.toBeInstanceOf(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// Admin: flipping the gate
// ---------------------------------------------------------------------------

describe('updateHelpCenterAccessFn', () => {
  it('rejects a caller without help-center manage permission', async () => {
    hoisted.mockRequireAuth.mockRejectedValue(new Error('Access denied'))

    await expect(
      updateHelpCenterAccessHandler({ data: { visibility: 'authenticated' } })
    ).rejects.toThrow('Access denied')
    expect(hoisted.mockUpdateHelpCenterConfig).not.toHaveBeenCalled()
  })

  it('persists the new visibility and audits the change', async () => {
    hoisted.mockRequireAuth.mockResolvedValue(ADMIN_AUTH)
    hoisted.mockGetHelpCenterConfig.mockResolvedValue({ access: { visibility: 'public' } })
    hoisted.mockUpdateHelpCenterConfig.mockResolvedValue({
      access: { visibility: 'authenticated' },
    })

    await updateHelpCenterAccessHandler({ data: { visibility: 'authenticated' } })

    expect(hoisted.mockUpdateHelpCenterConfig).toHaveBeenCalledWith({
      access: { visibility: 'authenticated' },
    })
    expect(hoisted.mockRecordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'help_center.visibility.changed',
        before: { visibility: 'public' },
        after: { visibility: 'authenticated' },
      })
    )
  })

  it('does not audit a no-op save', async () => {
    hoisted.mockRequireAuth.mockResolvedValue(ADMIN_AUTH)
    hoisted.mockGetHelpCenterConfig.mockResolvedValue({ access: { visibility: 'public' } })
    hoisted.mockUpdateHelpCenterConfig.mockResolvedValue({ access: { visibility: 'public' } })

    await updateHelpCenterAccessHandler({ data: { visibility: 'public' } })

    expect(hoisted.mockRecordAuditEvent).not.toHaveBeenCalled()
  })
})
