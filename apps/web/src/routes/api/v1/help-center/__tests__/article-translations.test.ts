import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiAuthContext } from '@/lib/server/domains/api/auth'
import type { ApiKeyId } from '@/lib/server/domains/api-keys'
import type {
  HelpCenterArticleTranslation,
  HelpCenterArticleWithCategory,
} from '@/lib/server/domains/help-center/help-center.types'
import type { HelpCenterConfig } from '@/lib/server/domains/settings/settings.types'
import type { KbArticleId, KbArticleTranslationId, KbCategoryId, PrincipalId } from '@quackback/ids'

// --- Mocks ---

vi.mock('@/lib/server/domains/api/auth', () => ({
  withApiKeyAuth: vi.fn(),
}))
vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  isFeatureEnabled: vi.fn(),
  getHelpCenterConfig: vi.fn(),
}))
vi.mock('@/lib/server/domains/help-center/help-center.service', () => ({
  getArticleById: vi.fn(),
}))
vi.mock('@/lib/server/domains/help-center/help-center-translations.service', () => ({
  listArticleTranslations: vi.fn(),
  getArticleTranslation: vi.fn(),
  upsertArticleTranslation: vi.fn(),
  setArticleTranslationStatus: vi.fn(),
  deleteArticleTranslation: vi.fn(),
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
import { getArticleById } from '@/lib/server/domains/help-center/help-center.service'
import {
  listArticleTranslations,
  getArticleTranslation,
  upsertArticleTranslation,
  setArticleTranslationStatus,
  deleteArticleTranslation,
} from '@/lib/server/domains/help-center/help-center-translations.service'
import { parseTypeId } from '@/lib/server/domains/api/validation'
import { NotFoundError } from '@/lib/shared/errors'

import { Route as TranslationListRoute } from '../articles/$articleId.translations'
import { Route as TranslationDetailRoute } from '../articles/$articleId.translations.$locale'

type MockedHandler = (ctx: {
  request: Request
  params: Record<string, string>
}) => Promise<Response>
type MockedRouteShape = { options: { server: { handlers: Record<string, MockedHandler> } } }

const listHandlers = (TranslationListRoute as unknown as MockedRouteShape).options.server.handlers
const detailHandlers = (TranslationDetailRoute as unknown as MockedRouteShape).options.server
  .handlers

// --- Helpers ---

function createRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

const ARTICLE_ID = 'kb_article_1' as KbArticleId

const swedishParams = { articleId: ARTICLE_ID, locale: 'sv' }

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

const mockArticle = {
  id: ARTICLE_ID,
  categoryId: 'kb_category_1' as KbCategoryId,
  slug: 'users',
  title: 'Users',
} as HelpCenterArticleWithCategory

function buildTranslation(
  overrides: Partial<HelpCenterArticleTranslation> = {}
): HelpCenterArticleTranslation {
  return {
    id: 'kb_article_translation_1' as KbArticleTranslationId,
    articleId: ARTICLE_ID,
    locale: 'sv',
    title: 'Användare',
    description: 'Hantera användare.',
    content: '## Användare\n\nHantera användare.',
    contentJson: null,
    status: 'draft',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-10'),
    ...overrides,
  } as HelpCenterArticleTranslation
}

const validBody = {
  title: 'Användare',
  content: '## Användare\n\nHantera användare.',
  description: 'Hantera användare.',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isFeatureEnabled).mockResolvedValue(true)
  vi.mocked(withApiKeyAuth).mockResolvedValue(mockAuthContext)
  vi.mocked(getHelpCenterConfig).mockResolvedValue(mockHelpCenterConfig)
  vi.mocked(parseTypeId).mockImplementation((v) => v as string)
  vi.mocked(getArticleById).mockResolvedValue(mockArticle)
})

// --- Tests ---

describe('PUT /api/v1/help-center/articles/{articleId}/translations/{locale}', () => {
  it('writes the translation and returns it', async () => {
    vi.mocked(upsertArticleTranslation).mockResolvedValue(buildTranslation())

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.locale).toBe('sv')
    expect(json.data.title).toBe('Användare')
    expect(json.data.status).toBe('draft')
    expect(json.data.updatedAt).toBe('2026-01-10T00:00:00.000Z')
    expect(upsertArticleTranslation).toHaveBeenCalledWith({
      articleId: ARTICLE_ID,
      locale: 'sv',
      title: validBody.title,
      content: validBody.content,
      description: validBody.description,
    })
  })

  it('publishes when the requested status differs from the stored one', async () => {
    vi.mocked(upsertArticleTranslation).mockResolvedValue(buildTranslation({ status: 'draft' }))
    vi.mocked(setArticleTranslationStatus).mockResolvedValue(
      buildTranslation({ status: 'published' })
    )

    const request = createRequest('PUT', 'http://localhost/', {
      ...validBody,
      status: 'published',
    })
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(200)
    expect(setArticleTranslationStatus).toHaveBeenCalledWith(ARTICLE_ID, 'sv', 'published')
    const json = await response.json()
    expect(json.data.status).toBe('published')
  })

  // Re-syncing edited copy must not take the Swedish page down, and an upsert
  // leaves `status` alone -- so an omitted status has to mean "leave it".
  it('leaves a published translation published when no status is sent', async () => {
    vi.mocked(upsertArticleTranslation).mockResolvedValue(buildTranslation({ status: 'published' }))

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(200)
    expect(setArticleTranslationStatus).not.toHaveBeenCalled()
    const json = await response.json()
    expect(json.data.status).toBe('published')
  })

  it('does not re-stamp the status when it already matches', async () => {
    vi.mocked(upsertArticleTranslation).mockResolvedValue(buildTranslation({ status: 'published' }))

    const request = createRequest('PUT', 'http://localhost/', {
      ...validBody,
      status: 'published',
    })
    await detailHandlers.PUT({ request, params: swedishParams })

    expect(setArticleTranslationStatus).not.toHaveBeenCalled()
  })

  it('stores the locale spelling the help center serves, not the one requested', async () => {
    vi.mocked(upsertArticleTranslation).mockResolvedValue(buildTranslation())

    const request = createRequest('PUT', 'http://localhost/', validBody)
    await detailHandlers.PUT({ request, params: { articleId: ARTICLE_ID, locale: 'SV' } })

    expect(upsertArticleTranslation).toHaveBeenCalledWith(expect.objectContaining({ locale: 'sv' }))
  })

  it('rejects the base content locale', async () => {
    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({
      request,
      params: { articleId: ARTICLE_ID, locale: 'en' },
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.message).toContain('base content locale')
    expect(upsertArticleTranslation).not.toHaveBeenCalled()
  })

  // A row for a locale with no /hc/{locale} URL stores fine and never renders.
  it('rejects a locale the help center has not enabled, naming the ones it has', async () => {
    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({
      request,
      params: { articleId: ARTICLE_ID, locale: 'de' },
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.message).toContain('sv')
    expect(upsertArticleTranslation).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown article instead of a constraint violation', async () => {
    vi.mocked(getArticleById).mockRejectedValue(
      new NotFoundError('ARTICLE_NOT_FOUND', 'Article not found')
    )

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(404)
    expect(upsertArticleTranslation).not.toHaveBeenCalled()
  })

  it('returns 400 for a body with no content', async () => {
    const request = createRequest('PUT', 'http://localhost/', { title: 'Användare' })
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.details.errors.content).toBeDefined()
  })

  it('returns 404 when the help center feature is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const request = createRequest('PUT', 'http://localhost/', validBody)
    const response = await detailHandlers.PUT({ request, params: swedishParams })

    expect(response.status).toBe(404)
  })
})

describe('GET /api/v1/help-center/articles/{articleId}/translations/{locale}', () => {
  it('returns the stored translation', async () => {
    vi.mocked(getArticleTranslation).mockResolvedValue(buildTranslation())

    const request = createRequest('GET', 'http://localhost/')
    const response = await detailHandlers.GET({ request, params: swedishParams })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.content).toBe('## Användare\n\nHantera användare.')
  })

  it('returns 404 when the article has no translation in that locale', async () => {
    vi.mocked(getArticleTranslation).mockResolvedValue(null)

    const request = createRequest('GET', 'http://localhost/')
    const response = await detailHandlers.GET({ request, params: swedishParams })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/v1/help-center/articles/{articleId}/translations/{locale}', () => {
  it('removes the translation', async () => {
    vi.mocked(deleteArticleTranslation).mockResolvedValue(undefined)

    const request = createRequest('DELETE', 'http://localhost/')
    const response = await detailHandlers.DELETE({ request, params: swedishParams })

    expect(response.status).toBe(204)
    expect(deleteArticleTranslation).toHaveBeenCalledWith(ARTICLE_ID, 'sv')
  })

  it('is idempotent when there is nothing to delete', async () => {
    vi.mocked(deleteArticleTranslation).mockResolvedValue(undefined)

    const request = createRequest('DELETE', 'http://localhost/')
    const response = await detailHandlers.DELETE({ request, params: swedishParams })

    expect(response.status).toBe(204)
  })
})

describe('GET /api/v1/help-center/articles/{articleId}/translations', () => {
  it('summarises every locale without returning the bodies', async () => {
    vi.mocked(listArticleTranslations).mockResolvedValue([
      buildTranslation({ status: 'published' }),
    ])

    const request = createRequest('GET', 'http://localhost/')
    const response = await listHandlers.GET({ request, params: { articleId: ARTICLE_ID } })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].locale).toBe('sv')
    expect(json.data[0].status).toBe('published')
    expect(json.data[0].content).toBeUndefined()
  })

  it('returns 404 for an unknown article rather than an empty list', async () => {
    vi.mocked(getArticleById).mockRejectedValue(
      new NotFoundError('ARTICLE_NOT_FOUND', 'Article not found')
    )

    const request = createRequest('GET', 'http://localhost/')
    const response = await listHandlers.GET({ request, params: { articleId: ARTICLE_ID } })

    expect(response.status).toBe(404)
    expect(listArticleTranslations).not.toHaveBeenCalled()
  })
})
