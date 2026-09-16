import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiAuthContext } from '@/lib/server/domains/api/auth'
import type { ApiKeyId } from '@/lib/server/domains/api-keys'
import type {
  HelpCenterCategory,
  HelpCenterCategoryTranslation,
} from '@/lib/server/domains/help-center/help-center.types'
import type { HelpCenterConfig } from '@/lib/server/domains/settings/settings.types'
import type { KbCategoryId, KbCategoryTranslationId, PrincipalId } from '@quackback/ids'

// --- Mocks ---

vi.mock('@/lib/server/domains/api/auth', () => ({
  withApiKeyAuth: vi.fn(),
}))
vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
  getHelpCenterConfig: vi.fn(),
}))
vi.mock('@/lib/server/domains/help-center/help-center.service', () => ({
  getCategoryById: vi.fn(),
}))
vi.mock('@/lib/server/domains/help-center/help-center-translations.service', () => ({
  listCategoryTranslations: vi.fn(),
  getCategoryTranslation: vi.fn(),
  upsertCategoryTranslation: vi.fn(),
  deleteCategoryTranslation: vi.fn(),
}))
vi.mock('@/lib/server/domains/api/validation', () => ({
  parseTypeId: vi.fn(),
}))
// Mock createFileRoute to avoid TanStack side effects
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => (opts: unknown) => ({ options: opts })),
}))

// --- Imports ---

import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import {
  getHelpCenterConfig,
  isFeatureEnabled,
} from '@/lib/server/domains/settings/settings.service'
import { getCategoryById } from '@/lib/server/domains/help-center/help-center.service'
import {
  listCategoryTranslations,
  getCategoryTranslation,
  upsertCategoryTranslation,
  deleteCategoryTranslation,
} from '@/lib/server/domains/help-center/help-center-translations.service'
import { parseTypeId } from '@/lib/server/domains/api/validation'
import { NotFoundError } from '@/lib/shared/errors'

import { Route as CategoryTranslationListRoute } from '../categories/$categoryId.translations'
import { Route as CategoryTranslationDetailRoute } from '../categories/$categoryId.translations.$locale'

type MockedHandler = (ctx: {
  request: Request
  params: Record<string, string>
}) => Promise<Response>
type MockedRouteShape = { options: { server: { handlers: Record<string, MockedHandler> } } }

const listHandlers = (CategoryTranslationListRoute as unknown as MockedRouteShape).options.server
  .handlers
const detailHandlers = (CategoryTranslationDetailRoute as unknown as MockedRouteShape).options
  .server.handlers

// --- Helpers ---

function createRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

const CATEGORY_ID = 'kb_category_1' as KbCategoryId

const swedishParams = { categoryId: CATEGORY_ID, locale: 'sv' }

const mockAuthContext: ApiAuthContext = {
  apiKey: {
    id: 'api_key_test' as ApiKeyId,
    name: 'test',
    keyPrefix: 'qb_',
    createdById: null,
    principalId: 'principal_1' as PrincipalId,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01'),
    revokedAt: null,
    scopes: null,
  },
  principalId: 'principal_1' as PrincipalId,
  role: 'admin',
  principal: null,
  importMode: false,
}

/** English authored, Swedish enabled beside it -- the bos-v3 product-docs shape. */
const mockHelpCenterConfig = {
  locales: { default: 'en', additional: ['sv'], chrome: {} },
} as HelpCenterConfig

const mockCategory = {
  id: CATEGORY_ID,
  slug: 'people',
  name: 'People',
} as HelpCenterCategory

function buildCategoryTranslation(
  overrides: Partial<HelpCenterCategoryTranslation> = {}
): HelpCenterCategoryTranslation {
  return {
    id: 'kb_category_translation_1' as KbCategoryTranslationId,
    categoryId: CATEGORY_ID,
    locale: 'sv',
    name: 'Personal',
    description: 'Hantera personal.',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-10'),
    ...overrides,
  }
}

const validBody = { name: 'Personal', description: 'Hantera personal.' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isFeatureEnabled).mockResolvedValue(true)
  vi.mocked(withApiKeyAuth).mockResolvedValue(mockAuthContext)
  vi.mocked(getHelpCenterConfig).mockResolvedValue(mockHelpCenterConfig)
  vi.mocked(parseTypeId).mockImplementation((v) => v as string)
  vi.mocked(getCategoryById).mockResolvedValue(mockCategory)
})

// --- Tests ---

describe('PUT /api/v1/help-center/categories/{categoryId}/translations/{locale}', () => {
  it('writes the translated name and returns it', async () => {
    vi.mocked(upsertCategoryTranslation).mockResolvedValue(buildCategoryTranslation())

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.name).toBe('Personal')
    expect(json.data.locale).toBe('sv')
    expect(upsertCategoryTranslation).toHaveBeenCalledWith({
      categoryId: CATEGORY_ID,
      locale: 'sv',
      name: validBody.name,
      description: validBody.description,
    })
  })

  it('stores the locale spelling the help center serves, not the one requested', async () => {
    vi.mocked(upsertCategoryTranslation).mockResolvedValue(buildCategoryTranslation())

    const request = createRequest('PUT', 'http://localhost/', validBody)
    await detailHandlers.PUT({ request, params: { categoryId: CATEGORY_ID, locale: 'SV' } })

    expect(upsertCategoryTranslation).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'sv' })
    )
  })

  it('rejects the base content locale', async () => {
    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({
      request,
      params: { categoryId: CATEGORY_ID, locale: 'en' },
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.message).toContain('base content locale')
    expect(upsertCategoryTranslation).not.toHaveBeenCalled()
  })

  it('rejects a locale the help center has not enabled, naming the ones it has', async () => {
    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({
      request,
      params: { categoryId: CATEGORY_ID, locale: 'de' },
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.message).toContain('sv')
    expect(upsertCategoryTranslation).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown category instead of a constraint violation', async () => {
    vi.mocked(getCategoryById).mockRejectedValue(
      new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found')
    )

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(404)
    expect(upsertCategoryTranslation).not.toHaveBeenCalled()
  })

  it('returns 400 for a body with no name', async () => {
    const request = createRequest('PUT', 'http://localhost/', { description: 'Hantera personal.' })
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.details.errors.name).toBeDefined()
  })

  it('returns 404 when the help center feature is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(404)
  })
})

describe('GET /api/v1/help-center/categories/{categoryId}/translations/{locale}', () => {
  it('returns the stored translation', async () => {
    vi.mocked(getCategoryTranslation).mockResolvedValue(buildCategoryTranslation())

    const request = createRequest('GET', 'http://localhost/')
    const response = await detailHandlers.GET({ request, params: swedishParams })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.name).toBe('Personal')
  })

  it('returns 404 when the category has no translation in that locale', async () => {
    vi.mocked(getCategoryTranslation).mockResolvedValue(null)

    const request = createRequest('GET', 'http://localhost/')
    const response = await detailHandlers.GET({ request, params: swedishParams })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/v1/help-center/categories/{categoryId}/translations/{locale}', () => {
  it('removes the translation', async () => {
    vi.mocked(deleteCategoryTranslation).mockResolvedValue(undefined)

    const request = createRequest('DELETE', 'http://localhost/')
    const response = await detailHandlers.DELETE({ request, params: swedishParams })

    expect(response.status).toBe(204)
    expect(deleteCategoryTranslation).toHaveBeenCalledWith(CATEGORY_ID, 'sv')
  })
})

describe('GET /api/v1/help-center/categories/{categoryId}/translations', () => {
  it('lists every locale the category carries a name in', async () => {
    vi.mocked(listCategoryTranslations).mockResolvedValue([buildCategoryTranslation()])

    const request = createRequest('GET', 'http://localhost/')
    const response = await listHandlers.GET({ request, params: { categoryId: CATEGORY_ID } })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].locale).toBe('sv')
    expect(json.data[0].name).toBe('Personal')
  })

  it('returns 404 for an unknown category rather than an empty list', async () => {
    vi.mocked(getCategoryById).mockRejectedValue(
      new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found')
    )

    const request = createRequest('GET', 'http://localhost/')
    const response = await listHandlers.GET({ request, params: { categoryId: CATEGORY_ID } })

    expect(response.status).toBe(404)
    expect(listCategoryTranslations).not.toHaveBeenCalled()
  })
})
