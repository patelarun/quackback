/**
 * `handleNewDeviceNotification` — runs after `handleSignInSuccessAudit`
 * in the hooksAfter chain. Uses the two-phase tracker API:
 *   1. `isDeviceUnseen` atomically claims the fingerprint via SADD.
 *      Returns true iff this is the first sighting (SADD reply = 1).
 *   2. On true: emit the `auth.signin.new_device` audit row.
 *      On success: call `markDeviceSeen` to refresh the 90-day TTL.
 *      On failure: call `forgetDevice` to roll back the claim so the
 *      next sign-in re-records it.
 *
 * Audit only — the handler mails nobody. `sends no email on a
 * first-seen device` below is the regression guard for that: upstream
 * emailed the account here, which for an embedded widget is an
 * unsolicited security alert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/server/config', () => ({ config: { trustedProxyHops: 1 } }))

const mockIsDeviceUnseen = vi.fn()
const mockMarkDeviceSeen = vi.fn(async (_userId: string) => undefined)
const mockForgetDevice = vi.fn(async (_userId: string, _fp: string) => undefined)
const mockRecordAuditEvent = vi.fn(async (_spec: unknown) => undefined)
// Kept mocked though the handler no longer imports it: if a future edit
// re-introduces a send, these tests must fail loudly rather than reach a
// real transport.
const mockSendNewSignInEmail = vi.fn(async (_params: unknown) => ({ sent: true }))

vi.mock('../signin-device-tracker', () => ({
  computeDeviceFingerprint: (ua: string, ip: string) => `fp-${ua}-${ip}`,
  isDeviceUnseen: (userId: string, fp: string) => mockIsDeviceUnseen(userId, fp),
  markDeviceSeen: (userId: string) => mockMarkDeviceSeen(userId),
  forgetDevice: (userId: string, fp: string) => mockForgetDevice(userId, fp),
}))

vi.mock('@quackback/email', () => ({
  sendNewSignInEmail: (params: unknown) => mockSendNewSignInEmail(params),
}))

vi.mock('@/lib/server/audit/log', () => ({
  recordAuditEvent: (spec: unknown) => mockRecordAuditEvent(spec),
}))

// The alert is account-class, so the recipient is looked up by id rather than
// read off the session — the session's address would be the synthetic
// placeholder for anyone whose provider releases no email.
vi.mock('@/lib/server/db', async (orig) => {
  const actual = await orig<typeof import('@/lib/server/db')>()
  return {
    ...actual,
    db: { query: { user: { findFirst: vi.fn(async () => ({ email: 'a@b.com' })) } } },
  }
})

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () =>
    new Headers({ 'user-agent': 'Mozilla/5.0 Test', 'x-forwarded-for': '203.0.113.42' }),
}))

const { handleNewDeviceNotification } = await import('../hooks')

type Ctx = Parameters<typeof handleNewDeviceNotification>[0]

const buildCtx = (overrides: Partial<Ctx> = {}): Ctx => ({
  path: '/sign-in/email',
  context: {
    newSession: {
      user: { id: 'user_abc', email: 'a@b.com' },
      session: { token: 'tok' },
    },
  },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  // Restore default impls — `clearAllMocks` clears history but `*Once`
  // implementations queued by prior tests can still influence the
  // first call. Explicit reset keeps each test independent.
  mockIsDeviceUnseen.mockReset().mockResolvedValue(false)
  mockMarkDeviceSeen.mockReset().mockResolvedValue(undefined)
  mockForgetDevice.mockReset().mockResolvedValue(undefined)
  mockRecordAuditEvent.mockReset().mockResolvedValue(undefined)
  mockSendNewSignInEmail.mockReset().mockResolvedValue({ sent: true })
})

describe('handleNewDeviceNotification — happy path', () => {
  it('audits + markDeviceSeen on first-seen device', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    await handleNewDeviceNotification(buildCtx())

    expect(mockRecordAuditEvent).toHaveBeenCalledTimes(1)
    const auditArgs = mockRecordAuditEvent.mock.calls[0][0] as {
      event: string
      actor: { userId: string; email: string }
      metadata: { ip: string; userAgent: string }
    }
    expect(auditArgs.event).toBe('auth.signin.new_device')
    expect(auditArgs.actor.userId).toBe('user_abc')
    expect(auditArgs.metadata.ip).toBe('203.0.113.42')
    expect(auditArgs.metadata.userAgent).toBe('Mozilla/5.0 Test')

    // TTL refreshed only on the success path.
    expect(mockMarkDeviceSeen).toHaveBeenCalledWith('user_abc')
    expect(mockForgetDevice).not.toHaveBeenCalled()
  })

  it('sends no email on a first-seen device', async () => {
    // The reason this fork carries a patch: a first-seen device is exactly
    // the case upstream mailed on, and the one customers complained about.
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    await handleNewDeviceNotification(buildCtx())

    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()
  })

  it('no-ops when the device is already known', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(false)
    await handleNewDeviceNotification(buildCtx())

    expect(mockRecordAuditEvent).not.toHaveBeenCalled()
    expect(mockMarkDeviceSeen).not.toHaveBeenCalled()
    expect(mockForgetDevice).not.toHaveBeenCalled()
    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()
  })
})

describe('handleNewDeviceNotification — guards', () => {
  it('bails when newSession is missing (sign-in was revoked upstream)', async () => {
    const ctx = buildCtx({ context: { newSession: null } })
    await handleNewDeviceNotification(ctx)
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
  })

  it('bails when user.email is missing (can’t notify without an address)', async () => {
    const ctx = buildCtx({
      context: { newSession: { user: { id: 'user_x' }, session: { token: 'tok' } } },
    })
    await handleNewDeviceNotification(ctx)
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
  })
})

describe('handleNewDeviceNotification — failure tolerance', () => {
  it('swallows isDeviceUnseen errors (Redis outage should not block sign-in)', async () => {
    mockIsDeviceUnseen.mockRejectedValueOnce(new Error('redis down'))
    await expect(handleNewDeviceNotification(buildCtx())).resolves.toBeUndefined()
    // Tracker errored before claiming → no rollback needed.
    expect(mockForgetDevice).not.toHaveBeenCalled()
  })

  it('rolls back via forgetDevice when recordAuditEvent throws', async () => {
    // The audit write is now the only fallible step, so it carries the
    // rollback guarantee that the SMTP path used to: a transient outage
    // must NOT permanently mark the device as seen.
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    mockRecordAuditEvent.mockRejectedValueOnce(new Error('audit store down'))

    await expect(handleNewDeviceNotification(buildCtx())).resolves.toBeUndefined()

    expect(mockForgetDevice).toHaveBeenCalledWith('user_abc', expect.stringMatching(/^fp-/))
    expect(mockMarkDeviceSeen).not.toHaveBeenCalled()
  })
})

describe('handleNewDeviceNotification — account with no deliverable address', () => {
  it('audits and marks the device seen, same as any other account', async () => {
    // Once nothing is mailed, recipient class stops mattering here: an account
    // carrying a synthetic placeholder (provider released no email) takes the
    // identical path to one with a real address. Kept as a guard that the
    // handler does not regain a recipient lookup it no longer needs.
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    const { db } = await import('@/lib/server/db')
    vi.mocked(db.query.user.findFirst).mockResolvedValueOnce({
      email: 'sso-oidc-abc-deadbeef@anon.quackback.io',
    } as never)

    await handleNewDeviceNotification(buildCtx())

    expect(mockRecordAuditEvent).toHaveBeenCalled()
    expect(mockMarkDeviceSeen).toHaveBeenCalled()
    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()
  })
})
