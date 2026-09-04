/**
 * The API reference and its spec are teammate-only.
 *
 * Upstream ships both as public endpoints, and the docstrings said so out loud
 * ("This endpoint is public and does not require authentication"). That is a
 * reasonable default for a developer platform and the wrong one here: this
 * install is a private support portal, only `api_key.manage` holders can call
 * the API at all, and the spec is a complete map of every endpoint an attacker
 * holding a leaked key would want.
 *
 * The gate is therefore a decision, not an implementation detail — and exactly
 * the kind that a future upstream merge would silently revert. These tests are
 * the ratchet: they fail if either endpoint becomes reachable again, and if the
 * gate stops distinguishing a portal user from a teammate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PERMISSIONS } from '@/lib/shared/permissions'

const hoisted = vi.hoisted(() => ({ mockRequireAuth: vi.fn() }))

vi.mock('@/lib/server/functions/auth-helpers', () => ({
  requireAuth: hoisted.mockRequireAuth,
}))

// The docs page renders `config.baseUrl` into the Swagger bootstrap. Stubbed so
// these tests exercise the gate rather than the full env-validation path.
vi.mock('@/lib/server/config', () => ({
  config: { baseUrl: 'https://feedback.example.test' },
}))

import { Route as DocsRoute } from '@/routes/api/v1/docs'
import { Route as SpecRoute } from '@/routes/api/v1/openapi.json'

type Handlers = { handlers: { GET: () => Promise<Response> } }
const getDocs = (DocsRoute.options.server as unknown as Handlers).handlers.GET
const getSpec = (SpecRoute.options.server as unknown as Handlers).handlers.GET

const surfaces = [
  ['the Swagger UI page', () => getDocs()],
  ['the OpenAPI spec', () => getSpec()],
] as const

beforeEach(() => {
  vi.clearAllMocks()
  hoisted.mockRequireAuth.mockResolvedValue({ settings: { slug: 'acme' } })
})

describe.each(surfaces)('%s', (_label, call) => {
  it('refuses an unauthenticated request', async () => {
    hoisted.mockRequireAuth.mockRejectedValue(new Error('Authentication required'))
    const res = await call()
    expect(res.status).toBe(403)
  })

  it('refuses a signed-in portal user, who is a principal but not a teammate', async () => {
    // The failure mode this guards: `requireAuth()` with no permission would
    // pass here, because a customer with an account has a principal row too.
    hoisted.mockRequireAuth.mockRejectedValue(
      new Error("Access denied: Requires permission 'api_key.manage', role user lacks it")
    )
    const res = await call()
    expect(res.status).toBe(403)
  })

  it('demands the permission that can actually mint an API key', async () => {
    await call()
    expect(hoisted.mockRequireAuth).toHaveBeenCalledWith({
      permission: PERMISSIONS.API_KEY_MANAGE,
    })
  })

  it('serves a teammate who holds it', async () => {
    const res = await call()
    expect(res.status).toBe(200)
  })

  it('never lets a shared cache hold the authenticated response', async () => {
    const res = await call()
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(res.headers.get('Vary')).toContain('Cookie')
  })
})

describe('the refusal itself', () => {
  it('leaks nothing about the API surface', async () => {
    hoisted.mockRequireAuth.mockRejectedValue(new Error('Authentication required'))
    const body = await (await getSpec()).text()
    expect(body).toBe(JSON.stringify({ error: 'Access denied' }))
    expect(body).not.toMatch(/paths|openapi|conversations|moderation/i)
  })
})
