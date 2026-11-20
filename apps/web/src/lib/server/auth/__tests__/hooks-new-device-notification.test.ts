/**
 * `handleNewDeviceNotification` — runs after `handleSignInSuccessAudit`
 * in the hooksAfter chain. Identity is the signed device cookie.
 *   1. Resolve / mint a cookie id, write it on every real sign-in.
 *   2. `isDeviceUnseen` atomically claims the id.
 *      Returns true iff this is an additional unseen device.
 *   3. On true: emit the `auth.signin.new_device` audit row. No email — the
 *      fork deliberately sends none (see the handler's doc comment).
 *      On failure: call `forgetDevice` to roll back the claim so the
 *      next sign-in re-records it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/server/config', () => ({
  config: { trustedProxyHops: 1 },
  getBaseUrl: () => 'https://acme.example',
}))

vi.mock('@/lib/server/secret-key', () => ({
  activeSecretKey: () => 'unit-test-device-cookie-secret',
}))

const MINTED_DEVICE_ID = 'ab'.repeat(16)

vi.mock('../signin-device-cookie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../signin-device-cookie')>()
  return {
    ...actual,
    mintDeviceId: () => MINTED_DEVICE_ID,
  }
})

const mockIsDeviceUnseen = vi.fn()
const mockForgetDevice = vi.fn(async (_userId: string, _deviceId: string) => undefined)
const mockSendNewSignInEmail = vi.fn(async (_params: unknown) => ({ sent: true }))
const mockRecordAuditEvent = vi.fn(async (_spec: unknown) => undefined)

vi.mock('../signin-device-tracker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../signin-device-tracker')>()
  return {
    ...actual,
    isDeviceUnseen: (userId: string, deviceId: string) => mockIsDeviceUnseen(userId, deviceId),
    forgetDevice: (userId: string, deviceId: string) => mockForgetDevice(userId, deviceId),
  }
})

// Mocked only so the tests can assert it is never called.
vi.mock('@quackback/email', () => ({
  sendNewSignInEmail: (params: unknown) => mockSendNewSignInEmail(params),
}))

vi.mock('@/lib/server/audit/log', () => ({
  recordAuditEvent: (spec: unknown) => mockRecordAuditEvent(spec),
}))

const defaultHeaders = () =>
  new Headers({
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'x-forwarded-for': '203.0.113.42',
  })

const mockGetRequestHeaders = vi.fn(defaultHeaders)

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => mockGetRequestHeaders(),
}))

const { handleNewDeviceNotification } = await import('../hooks')
const { deviceCookieAttributes, deviceCookieName, signDeviceCookie } =
  await import('../signin-device-cookie')

type Ctx = Parameters<typeof handleNewDeviceNotification>[0]

const mockSetCookie = vi.fn()

const buildCtx = (overrides: Partial<Ctx> = {}): Ctx => ({
  path: '/sign-in/email',
  context: {
    newSession: {
      user: { id: 'user_abc', email: 'a@b.com' },
      session: { token: 'tok' },
    },
  },
  setCookie: mockSetCookie,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRequestHeaders.mockImplementation(defaultHeaders)
  // Restore default impls — `clearAllMocks` clears history but `*Once`
  // implementations queued by prior tests can still influence the
  // first call. Explicit reset keeps each test independent.
  mockIsDeviceUnseen.mockReset().mockResolvedValue(false)
  mockForgetDevice.mockReset().mockResolvedValue(undefined)
  mockSendNewSignInEmail.mockReset().mockResolvedValue({ sent: true })
  mockRecordAuditEvent.mockReset().mockResolvedValue(undefined)
  mockSetCookie.mockReset()
})

function expectDeviceCookieWritten(deviceId: string = MINTED_DEVICE_ID) {
  expect(mockSetCookie).toHaveBeenCalledWith(
    deviceCookieName('user_abc'),
    signDeviceCookie('user_abc', deviceId),
    deviceCookieAttributes(true)
  )
}

describe('handleNewDeviceNotification — happy path', () => {
  it('audits an additional unseen device and sends no email', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    await handleNewDeviceNotification(buildCtx())

    expect(mockIsDeviceUnseen).toHaveBeenCalledWith('user_abc', MINTED_DEVICE_ID)
    expectDeviceCookieWritten()

    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()

    expect(mockRecordAuditEvent).toHaveBeenCalledTimes(1)
    const auditArgs = mockRecordAuditEvent.mock.calls[0][0] as {
      event: string
      metadata: { ip: string; device: string }
    }
    expect(auditArgs.event).toBe('auth.signin.new_device')
    expect(auditArgs.metadata.ip).toBe('203.0.113.42')
    expect(auditArgs.metadata.device).toBe('Chrome on Windows')

    expect(mockForgetDevice).not.toHaveBeenCalled()
  })

  it('still writes the cookie when the device is already known', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(false)
    await handleNewDeviceNotification(buildCtx())

    expectDeviceCookieWritten()
    expect(mockIsDeviceUnseen).toHaveBeenCalledWith('user_abc', MINTED_DEVICE_ID)
    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()
    expect(mockRecordAuditEvent).not.toHaveBeenCalled()
    expect(mockForgetDevice).not.toHaveBeenCalled()
  })

  it('reuses a valid cookie id instead of minting', async () => {
    const knownId = 'cd'.repeat(16)
    const headers = defaultHeaders()
    headers.set(
      'cookie',
      `${deviceCookieName('user_abc')}=${signDeviceCookie('user_abc', knownId)}`
    )
    mockGetRequestHeaders.mockReturnValueOnce(headers)
    mockIsDeviceUnseen.mockResolvedValueOnce(false)

    await handleNewDeviceNotification(buildCtx())

    expect(mockIsDeviceUnseen).toHaveBeenCalledWith('user_abc', knownId)
    expectDeviceCookieWritten(knownId)
  })

  it("ignores another user's cookie on a shared browser", async () => {
    const otherId = 'ee'.repeat(16)
    const headers = defaultHeaders()
    headers.set(
      'cookie',
      `${deviceCookieName('user_other')}=${signDeviceCookie('user_other', otherId)}`
    )
    mockGetRequestHeaders.mockReturnValueOnce(headers)
    mockIsDeviceUnseen.mockResolvedValueOnce(true)

    await handleNewDeviceNotification(buildCtx())

    expect(mockIsDeviceUnseen).toHaveBeenCalledWith('user_abc', MINTED_DEVICE_ID)
    expectDeviceCookieWritten()
  })
})

describe('handleNewDeviceNotification — guards', () => {
  it('bails when newSession is missing (sign-in was revoked upstream)', async () => {
    const ctx = buildCtx({ context: { newSession: null } })
    await handleNewDeviceNotification(ctx)
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('bails when user.email is missing', async () => {
    const ctx = buildCtx({
      context: { newSession: { user: { id: 'user_x' }, session: { token: 'tok' } } },
    })
    await handleNewDeviceNotification(ctx)
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
  })

  it('does not treat a session-cookie refresh as a sign-in', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    await handleNewDeviceNotification(buildCtx({ path: '/get-session' }))
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
    expect(mockRecordAuditEvent).not.toHaveBeenCalled()
    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('does not record an anonymous widget mint', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    await handleNewDeviceNotification(buildCtx({ path: '/sign-in/anonymous' }))
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
    expect(mockRecordAuditEvent).not.toHaveBeenCalled()
  })

  it('does not claim a minted id when setCookie is missing', async () => {
    const ctx = buildCtx()
    delete ctx.setCookie
    await handleNewDeviceNotification(ctx)
    expect(mockIsDeviceUnseen).not.toHaveBeenCalled()
    expect(mockRecordAuditEvent).not.toHaveBeenCalled()
  })

  it('still claims when an existing cookie cannot be refreshed', async () => {
    const knownId = 'cd'.repeat(16)
    const headers = defaultHeaders()
    headers.set(
      'cookie',
      `${deviceCookieName('user_abc')}=${signDeviceCookie('user_abc', knownId)}`
    )
    mockGetRequestHeaders.mockReturnValueOnce(headers)
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    const ctx = buildCtx()
    delete ctx.setCookie

    await handleNewDeviceNotification(ctx)

    expect(mockIsDeviceUnseen).toHaveBeenCalledWith('user_abc', knownId)
    expect(mockRecordAuditEvent).toHaveBeenCalled()
    expect(mockSendNewSignInEmail).not.toHaveBeenCalled()
  })
})

describe('handleNewDeviceNotification — failure tolerance', () => {
  it('rolls back via forgetDevice when recordAuditEvent throws', async () => {
    mockIsDeviceUnseen.mockResolvedValueOnce(true)
    mockRecordAuditEvent.mockRejectedValueOnce(new Error('audit store down'))

    await expect(handleNewDeviceNotification(buildCtx())).resolves.toBeUndefined()

    expect(mockForgetDevice).toHaveBeenCalledWith('user_abc', MINTED_DEVICE_ID)
  })
})
