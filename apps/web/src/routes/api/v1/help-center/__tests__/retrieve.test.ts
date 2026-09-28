import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiAuthContext } from '@/lib/server/domains/api/auth'
import type { ApiKeyId } from '@/lib/server/domains/api-keys'
import type { PrincipalId } from '@quackback/ids'

// --- Mocks ---

vi.mock('@/lib/server/domains/api/auth', () => ({
  withApiKeyAuth: vi.fn(),
}))
vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
  getHelpCenterConfig: vi.fn(),
}))
vi.mock('@/lib/server/domains/help-center/help-center-chunk-search.service', () => ({
  searchChunks: vi.fn(),
}))
// Mock createFileRoute to avoid TanStack side effects
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => (opts: unknown) => ({ options: opts })),
}))

// --- Imports ---

import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import {
  isFeatureEnabled,
  getHelpCenterConfig,
} from '@/lib/server/domains/settings/settings.service'
import { searchChunks } from '@/lib/server/domains/help-center/help-center-chunk-search.service'
import { ANONYMOUS_ACTOR } from '@/lib/server/policy/types'
import { UnauthorizedError } from '@/lib/shared/errors'
import type { ApiKeyScope } from '@/lib/shared/api-key-scopes'
import type { HelpCenterConfig } from '@/lib/shared/types/settings'

import { Route as RetrieveRoute } from '../retrieve'

type MockedHandler = (ctx: { request: Request }) => Promise<Response>
type MockedRouteShape = { options: { server: { handlers: Record<string, MockedHandler> } } }
const { POST } = (RetrieveRoute as unknown as MockedRouteShape).options.server.handlers

// --- Helpers ---

function retrieveRequest(body: unknown): Request {
  return new Request('http://localhost/api/v1/help-center/retrieve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function authWithScopes(scopes: ApiKeyScope[] | null): ApiAuthContext {
  return {
    apiKey: {
      id: 'api_key_test' as ApiKeyId,
      name: 'bos-assistant',
      keyPrefix: 'qb_',
      createdById: null,
      principalId: 'principal_1' as PrincipalId,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date('2026-01-01'),
      revokedAt: null,
      scopes,
    },
    principalId: 'principal_1' as PrincipalId,
    role: 'admin',
    principal: null,
    importMode: false,
  }
}

const noMatch = { sections: [], noMatch: true }

// --- Tests ---

describe('POST /api/v1/help-center/retrieve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isFeatureEnabled).mockResolvedValue(true)
    vi.mocked(withApiKeyAuth).mockResolvedValue(authWithScopes(['read:article']))
    vi.mocked(getHelpCenterConfig).mockResolvedValue({
      locales: { default: 'sv', additional: ['en'] },
    } as unknown as HelpCenterConfig)
    vi.mocked(searchChunks).mockResolvedValue(noMatch)
  })

  it('returns 404 when the help center is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const res = await POST({ request: retrieveRequest({ query: 'x' }) })
    expect(res.status).toBe(404)
    expect(withApiKeyAuth).not.toHaveBeenCalled()
  })

  it('returns 401 without a valid key', async () => {
    vi.mocked(withApiKeyAuth).mockRejectedValue(new UnauthorizedError('Invalid or missing API key'))
    const res = await POST({ request: retrieveRequest({ query: 'x' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 for a scoped key without read:article', async () => {
    vi.mocked(withApiKeyAuth).mockResolvedValue(authWithScopes(['read:feedback', 'write:article']))
    const res = await POST({ request: retrieveRequest({ query: 'x' }) })
    expect(res.status).toBe(403)
    expect(searchChunks).not.toHaveBeenCalled()
  })

  it('accepts a legacy full-authority key (no stored scopes)', async () => {
    vi.mocked(withApiKeyAuth).mockResolvedValue(authWithScopes(null))
    const res = await POST({ request: retrieveRequest({ query: 'x' }) })
    expect(res.status).toBe(200)
  })

  it('searches the base locale by default, as the anonymous public reader, 4 sections', async () => {
    const res = await POST({
      request: retrieveRequest({ query: '  Hur lägger jag till en användare?  ' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: noMatch })
    expect(searchChunks).toHaveBeenCalledWith({
      query: 'Hur lägger jag till en användare?',
      locale: 'sv',
      limit: 4,
      viewer: ANONYMOUS_ACTOR,
      fusion: undefined,
    })
  })

  it('passes an enabled additional locale, the limit and the fusion through', async () => {
    await POST({
      request: retrieveRequest({ query: 'add a user', locale: 'EN', limit: 8, fusion: 'weighted' }),
    })
    expect(searchChunks).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', limit: 8, fusion: 'weighted' })
    )
  })

  it('rejects a locale the help center does not serve rather than searching another', async () => {
    const res = await POST({ request: retrieveRequest({ query: 'x', locale: 'de' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.details.enabledLocales).toEqual(['sv', 'en'])
    expect(searchChunks).not.toHaveBeenCalled()
  })

  it.each([
    ['an empty query', { query: '   ' }],
    ['an overlong query', { query: 'a'.repeat(501) }],
    ['a limit above 8', { query: 'x', limit: 9 }],
    ['a limit below 1', { query: 'x', limit: 0 }],
    ['an unknown fusion', { query: 'x', fusion: 'max' }],
  ])('rejects %s', async (_label, body) => {
    const res = await POST({ request: retrieveRequest(body) })
    expect(res.status).toBe(400)
    expect(searchChunks).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const res = await POST({ request: retrieveRequest('not json') })
    expect(res.status).toBe(400)
  })
})
