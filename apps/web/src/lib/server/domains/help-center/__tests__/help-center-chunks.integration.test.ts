/**
 * Execution-level tests for the section index (help-center-chunk-index.service)
 * and section retrieval (help-center-chunk-search.service): real SQL against
 * the real database, so the visibility joins, the locale-stemmed tsvector and
 * the pgvector arm are all exercised rather than mocked.
 *
 * Embeddings are faked deterministically: a text mentioning PAYROLL_TERM embeds
 * to one unit vector and everything else to another, so the semantic arm can
 * be tested with a query that shares no word with the section it must find.
 *
 * Connects via DATABASE_URL (vitest pins quackback_test), falling back to the
 * dev DB; skips when neither is reachable -- same pattern as
 * help-center-segment-gate.integration.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'

const DIMENSIONS = 1536
const PAYROLL_TERM = 'lönearter'
const unitVector = (axis: number) =>
  Array.from({ length: DIMENSIONS }, (_, i) => (i === axis ? 1 : 0))

const fakeEmbedding = async (text: string) => unitVector(text.includes(PAYROLL_TERM) ? 0 : 1)

const embeddingMocks = vi.hoisted(() => ({
  generateKbEmbedding: vi.fn(),
  generateKbQueryEmbedding: vi.fn(),
}))

vi.mock('../help-center-embedding.service', () => ({
  generateKbEmbedding: embeddingMocks.generateKbEmbedding,
  generateKbQueryEmbedding: embeddingMocks.generateKbQueryEmbedding,
  generateArticleEmbedding: vi.fn().mockResolvedValue(true),
  clearQueryEmbeddingCache: vi.fn(),
  formatArticleText: (title: string) => title,
}))
vi.mock('@/lib/server/domains/ai/models', () => ({
  getEmbeddingModel: () => 'test-embedding-model',
}))
vi.mock('@/lib/server/config', () => ({
  getBaseUrl: () => 'https://help.example.test',
}))

import {
  helpCenterArticles,
  helpCenterArticleChunks,
  helpCenterArticleTranslations,
  helpCenterCategories,
  principal,
  type Database,
} from '@/lib/server/db'
// oxlint-disable-next-line no-restricted-imports -- legitimate createDb caller: this file owns the global db for its worker (see board-view-filter-parity.test.ts)
import { createDb } from '@quackback/db/client'
import { createId, type KbArticleId, type KbCategoryId, type PrincipalId } from '@quackback/ids'
import { reindexArticle, reindexArticleLocale } from '../help-center-chunk-index.service'
import { searchChunks } from '../help-center-chunk-search.service'
import { deleteArticleTranslation } from '../help-center-translations.service'

const runSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const SLUG_PREFIX = `ch-${runSuffix}-`
// Unique searchable token so keyword queries rank only this run's rows.
const TOKEN = `kvokka${runSuffix.replace(/[^a-z0-9]/gi, '')}`
const P_AUTHOR = createId('principal') as PrincipalId

const CANDIDATE_URLS = [
  process.env.DATABASE_URL,
  'postgresql://postgres:password@localhost:5432/quackback',
].filter((u): u is string => !!u)

async function pickWorkingDb(): Promise<{ db: Database; close: () => Promise<void> } | null> {
  for (const url of CANDIDATE_URLS) {
    try {
      const db = createDb(url, { max: 4, prepare: false })
      await db.execute(sql`select 1`)
      await db.execute(sql`select id from ${helpCenterArticleChunks} limit 0`)
      return {
        db,
        close: async () => {
          const raw = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client
          await raw?.end?.()
        },
      }
    } catch {
      // try next candidate
    }
  }
  return null
}

let activeDb: Database | null = null
let closeDb: (() => Promise<void>) | null = null
const resolved = await pickWorkingDb()
const dbAvailable = resolved !== null
if (resolved) {
  activeDb = resolved.db
  closeDb = resolved.close
  ;(globalThis as Record<string, unknown>).__db = resolved.db
}

// Long enough that "Hur gör jag?" exceeds the chunk budget and splits at its
// ### headings, as it does in the real product docs.
const SV_CONTENT = `## Vad är det?

Användare är alla som loggar in i BOS. ${TOKEN}

## Hur gör jag?

### Lägg till en användare

1. Gå till **Personal → Användare**.
2. Klicka på **Ny användare** och fyll i namn och e-post.

### Hantera ${PAYROLL_TERM}

Varje användare kan ha egna ${PAYROLL_TERM} för lönen.

### Redigera en användare

${'Öppna användaren, ändra uppgifterna och spara. '.repeat(30).trim()}`

const EN_CONTENT = `## What is it?

Users are everyone who signs in to BOS. ${TOKEN}

## How to

### Add a user

Go to **People → Users** and click **New user**.`

let catPublic: KbCategoryId
let catPrivate: KbCategoryId
let artPublished: KbArticleId
let artDraft: KbArticleId
let artPrivate: KbArticleId
let artDraftTranslation: KbArticleId

async function seedCategory(name: string, isPublic: boolean) {
  const id = createId('kb_category') as KbCategoryId
  await activeDb!.insert(helpCenterCategories).values({
    id,
    slug: `${SLUG_PREFIX}${name}`,
    name: `ch:${name}`,
    isPublic,
  })
  return id
}

async function seedArticle(name: string, categoryId: KbCategoryId, published: boolean) {
  const id = createId('kb_article') as KbArticleId
  await activeDb!.insert(helpCenterArticles).values({
    id,
    categoryId,
    slug: `${SLUG_PREFIX}${name}`,
    locale: 'sv',
    title: `Användare ${name}`,
    content: SV_CONTENT,
    principalId: P_AUTHOR,
    publishedAt: published ? new Date(Date.now() - 60_000) : null,
  })
  return id
}

async function seedTranslation(articleId: KbArticleId, status: 'draft' | 'published') {
  await activeDb!.insert(helpCenterArticleTranslations).values({
    articleId,
    locale: 'en',
    title: 'Users',
    content: EN_CONTENT,
    status,
  })
}

const chunksOf = (articleId: KbArticleId, locale: string) =>
  and(eq(helpCenterArticleChunks.articleId, articleId), eq(helpCenterArticleChunks.locale, locale))

const ownSlugs = (sections: Array<{ slug: string }>) =>
  sections.map((s) => s.slug).filter((s) => s.startsWith(SLUG_PREFIX))

describe.skipIf(!dbAvailable)('help-center section index and retrieval (execution-level)', () => {
  beforeAll(async () => {
    if (!activeDb) return
    await activeDb
      .delete(helpCenterCategories)
      .where(sql`${helpCenterCategories.slug} ~ '^ch-[0-9]+-'`)
    await activeDb
      .insert(principal)
      .values({ id: P_AUTHOR, createdAt: new Date() })
      .onConflictDoNothing()

    catPublic = await seedCategory('public', true)
    catPrivate = await seedCategory('private', false)
    artPublished = await seedArticle('published', catPublic, true)
    artDraft = await seedArticle('draft', catPublic, false)
    artPrivate = await seedArticle('private', catPrivate, true)
    artDraftTranslation = await seedArticle('draft-translation', catPublic, true)
    await seedTranslation(artPublished, 'published')
    await seedTranslation(artDraftTranslation, 'draft')
    embeddingMocks.generateKbEmbedding.mockImplementation(fakeEmbedding)
    for (const id of [artDraft, artPrivate, artDraftTranslation]) await reindexArticle(id)
  })

  beforeEach(() => {
    embeddingMocks.generateKbEmbedding.mockReset()
    embeddingMocks.generateKbEmbedding.mockImplementation(fakeEmbedding)
    embeddingMocks.generateKbQueryEmbedding.mockReset()
    embeddingMocks.generateKbQueryEmbedding.mockResolvedValue(null)
  })

  afterAll(async () => {
    if (activeDb) {
      // Articles, translations and chunks cascade from the categories.
      await activeDb
        .delete(helpCenterCategories)
        .where(sql`${helpCenterCategories.slug} LIKE ${`${SLUG_PREFIX}%`}`)
    }
    await closeDb?.()
  })

  describe('indexing', () => {
    it('indexes every locale of an article and embeds each chunk once', async () => {
      const result = await reindexArticle(artPublished)
      // sv: "Vad är det?" + the three ### tasks; en: "What is it?" + "How to".
      expect(result).toEqual({ chunks: 6, embedded: 6, reused: 0 })
    })

    it('re-embeds nothing when the content is unchanged', async () => {
      const result = await reindexArticleLocale(artPublished, 'sv')
      expect(result).toEqual({ chunks: 4, embedded: 0, reused: 4 })
      expect(embeddingMocks.generateKbEmbedding).not.toHaveBeenCalled()
    })

    it('re-embeds only the section that changed', async () => {
      await activeDb!
        .update(helpCenterArticles)
        .set({
          content: SV_CONTENT.replace('fyll i namn och e-post', 'fyll i namn, e-post och roll'),
        })
        .where(eq(helpCenterArticles.id, artPublished))
      const result = await reindexArticleLocale(artPublished, 'sv')
      expect(result).toEqual({ chunks: 4, embedded: 1, reused: 3 })
    })

    it('stamps position, heading path and embedding model', async () => {
      const rows = await activeDb!
        .select({
          position: helpCenterArticleChunks.position,
          heading: helpCenterArticleChunks.heading,
          headingPath: helpCenterArticleChunks.headingPath,
          embeddingModel: helpCenterArticleChunks.embeddingModel,
        })
        .from(helpCenterArticleChunks)
        .where(chunksOf(artPublished, 'sv'))
        .orderBy(helpCenterArticleChunks.position)
      expect(rows.map((r) => r.position)).toEqual([0, 1, 2, 3])
      expect(rows[1].headingPath).toBe(
        'Användare published › Hur gör jag? › Lägg till en användare'
      )
      expect(rows.every((r) => r.embeddingModel === 'test-embedding-model')).toBe(true)
    })
  })

  describe('retrieval', () => {
    it('finds a Swedish section through inflection, linked at its anchor', async () => {
      // "användarna" is not in the text; the Swedish stemmer reduces it and
      // "användare" to the same lexeme. The English config would not.
      const result = await searchChunks({
        query: `Lägga till användarna ${TOKEN}`,
        locale: 'sv',
        limit: 8,
      })
      expect(result.noMatch).toBe(false)
      const hit = result.sections.find(
        (s) => s.slug === `${SLUG_PREFIX}published` && s.heading === 'Lägg till en användare'
      )
      expect(hit).toBeDefined()
      expect(hit!.url).toMatch(
        new RegExp(
          `^https://help\\.example\\.test/hc/sv/articles/\\d+-${SLUG_PREFIX}published#l-gg-till-en-anv-ndare$`
        )
      )
    })

    it('never returns drafts or private categories', async () => {
      const result = await searchChunks({ query: TOKEN, locale: 'sv', limit: 8 })
      expect(new Set(ownSlugs(result.sections))).toEqual(
        new Set([`${SLUG_PREFIX}published`, `${SLUG_PREFIX}draft-translation`])
      )
    })

    it('searches only the requested locale, and only published translations', async () => {
      const result = await searchChunks({ query: TOKEN, locale: 'en', limit: 8 })
      expect(ownSlugs(result.sections)).toEqual([`${SLUG_PREFIX}published`])
      expect(result.sections[0].articleTitle).toBe('Users')
      expect(result.sections[0].url).toContain('/hc/en/articles/')
    })

    it('finds a section by meaning when no word is shared', async () => {
      embeddingMocks.generateKbQueryEmbedding.mockResolvedValue(unitVector(0))
      const result = await searchChunks({
        // No word shared with any seeded section, so only the semantic arm can match.
        query: 'konfigurera ersättningstyper',
        locale: 'sv',
        limit: 8,
      })
      const own = result.sections.filter((s) => s.slug.startsWith(SLUG_PREFIX))
      expect(own.length).toBeGreaterThan(0)
      expect(own.every((s) => s.heading === `Hantera ${PAYROLL_TERM}`)).toBe(true)
    })

    it('reports no match when nothing clears the floor', async () => {
      const result = await searchChunks({
        query: `zzq${runSuffix.replace(/\W/g, '')}`,
        locale: 'sv',
        limit: 4,
      })
      expect(result).toEqual({ sections: [], noMatch: true })
    })

    it('respects the limit', async () => {
      const result = await searchChunks({ query: TOKEN, locale: 'sv', limit: 1 })
      expect(result.sections).toHaveLength(1)
    })
  })

  describe('removal', () => {
    it('drops a locale when its translation is deleted', async () => {
      await deleteArticleTranslation(artPublished, 'en')
      const result = await searchChunks({ query: TOKEN, locale: 'en', limit: 8 })
      expect(ownSlugs(result.sections)).toEqual([])
      const [{ count }] = await activeDb!
        .select({ count: sql<number>`count(*)::int` })
        .from(helpCenterArticleChunks)
        .where(chunksOf(artPublished, 'en'))
      expect(count).toBe(0)
    })

    it('reindexArticle clears chunks for a locale with no source left', async () => {
      await activeDb!.insert(helpCenterArticleChunks).values({
        articleId: artPublished,
        locale: 'de',
        position: 0,
        headingPath: 'orphan',
        content: 'orphan',
        contentHash: 'orphan',
        tokenCount: 1,
      })
      await reindexArticle(artPublished)
      const [{ count }] = await activeDb!
        .select({ count: sql<number>`count(*)::int` })
        .from(helpCenterArticleChunks)
        .where(chunksOf(artPublished, 'de'))
      expect(count).toBe(0)
    })
  })
})
