/**
 * Help Center Section Retrieval
 *
 * Hybrid search over kb_article_chunks for ONE locale: a keyword arm on the
 * chunk's locale-stemmed search_vector and a semantic arm on its embedding,
 * fused into one ranking. Serves POST /api/v1/help-center/retrieve, whose
 * caller (the BOS assistant) writes its own answer from the sections returned.
 *
 * Two rules keep a chunk from ever being more visible than its source:
 *   - the article and its category must pass helpCenterVisibilityConditions,
 *     the same owner every other public read path uses;
 *   - a chunk in a locale other than the article's own is admitted only while
 *     that locale's translation row exists and is `published`.
 *
 * "No match" is decided by the raw signals, never by the fused score: a chunk
 * is a candidate only when its keyword rank or its cosine similarity clears a
 * floor. Reciprocal rank fusion orders candidates but has no absolute scale, so
 * it cannot say whether anything relevant was found.
 */

import {
  db,
  helpCenterArticles,
  helpCenterCategories,
  helpCenterArticleChunks,
  helpCenterArticleTranslations,
  and,
  eq,
  sql,
} from '@/lib/server/db'
import type { SQL } from 'drizzle-orm'
import { getBaseUrl } from '@/lib/server/config'
import { ANONYMOUS_ACTOR, type Actor } from '@/lib/server/policy/types'
import { hcArticlePath } from '@/lib/shared/help-center-url'
import { generateKbQueryEmbedding } from './help-center-embedding.service'
import {
  helpCenterVisibilityConditions,
  orTermsTsQueryForLocale,
  KEYWORD_WEIGHT,
  SEMANTIC_WEIGHT,
  SEMANTIC_SIMILARITY_FLOOR,
} from './help-center-search.service'
import { headingAnchor } from './help-center-chunking.service'

/**
 * ts_rank floor for a chunk's keyword match. Lower than the whole-article
 * KEYWORD_RANK_FLOOR: a section is short, so a real match scores lower than it
 * would against a whole article's accumulated term frequency. Starting value;
 * scripts/ai-qa/help_center_eval.rb in bos-backend-v2 is what tunes it.
 */
export const CHUNK_KEYWORD_RANK_FLOOR = 0.05

/** Cosine floor for a chunk's semantic match; shared with article search. */
export const CHUNK_SEMANTIC_SIMILARITY_FLOOR = SEMANTIC_SIMILARITY_FLOOR

/** Candidates taken from each arm before fusion. */
const CANDIDATES_PER_ARM = 30

/** The standard RRF damping constant (Cormack et al.). */
const RRF_K = 60

export type ChunkFusion = 'rrf' | 'weighted'

export interface SearchChunksOptions {
  query: string
  locale: string
  limit: number
  viewer?: Actor
  /** How to combine the two arms. RRF by default; `weighted` is the 0.4/0.6 article blend. */
  fusion?: ChunkFusion
}

export interface RetrievedSection {
  articleId: string
  slug: string
  urlId: number
  articleTitle: string
  heading: string | null
  headingPath: string
  content: string
  score: number
  url: string
}

export interface SearchChunksResult {
  sections: RetrievedSection[]
  noMatch: boolean
}

export interface Candidate {
  chunkId: string
  articleId: string
  slug: string
  urlId: number
  articleTitle: string
  heading: string | null
  headingPath: string
  content: string
  keyword: number | null
  semantic: number | null
}

export interface FusedCandidate extends Candidate {
  fusedScore: number
}

/** Visibility + locale predicate shared by both arms. */
function chunkVisibility(locale: string, viewer: Actor) {
  return and(
    eq(helpCenterArticleChunks.locale, locale),
    ...helpCenterVisibilityConditions('public', viewer),
    sql`(
      ${helpCenterArticleChunks.locale} = ${helpCenterArticles.locale}
      OR EXISTS (
        SELECT 1 FROM ${helpCenterArticleTranslations}
        WHERE ${helpCenterArticleTranslations.articleId} = ${helpCenterArticleChunks.articleId}
          AND ${helpCenterArticleTranslations.locale} = ${helpCenterArticleChunks.locale}
          AND ${helpCenterArticleTranslations.status} = 'published'
      )
    )`
  )
}

/** The article title as the reader of this locale sees it. */
const localizedTitle = sql<string>`COALESCE(
  (SELECT NULLIF(${helpCenterArticleTranslations.title}, '')
     FROM ${helpCenterArticleTranslations}
    WHERE ${helpCenterArticleTranslations.articleId} = ${helpCenterArticleChunks.articleId}
      AND ${helpCenterArticleTranslations.locale} = ${helpCenterArticleChunks.locale}
      AND ${helpCenterArticleChunks.locale} <> ${helpCenterArticles.locale}),
  ${helpCenterArticles.title}
)`

const candidateColumns = {
  chunkId: helpCenterArticleChunks.id,
  articleId: helpCenterArticleChunks.articleId,
  slug: helpCenterArticles.slug,
  urlId: helpCenterArticles.urlId,
  articleTitle: localizedTitle,
  heading: helpCenterArticleChunks.heading,
  headingPath: helpCenterArticleChunks.headingPath,
  content: helpCenterArticleChunks.content,
}

/** Candidate rows for one arm, `score` being that arm's raw signal. */
function chunkCandidateQuery(score: SQL.Aliased<number>) {
  return db
    .select({ ...candidateColumns, score })
    .from(helpCenterArticleChunks)
    .innerJoin(helpCenterArticles, eq(helpCenterArticleChunks.articleId, helpCenterArticles.id))
    .innerJoin(helpCenterCategories, eq(helpCenterArticles.categoryId, helpCenterCategories.id))
}

async function keywordCandidates(query: string, locale: string, viewer: Actor) {
  const tsQuery = orTermsTsQueryForLocale(query, locale)
  const rank = sql<number>`ts_rank(${helpCenterArticleChunks.searchVector}, ${tsQuery})`
  return chunkCandidateQuery(rank.as('keyword_score'))
    .where(
      and(
        chunkVisibility(locale, viewer),
        sql`${helpCenterArticleChunks.searchVector} @@ ${tsQuery}`,
        sql`${rank} > ${CHUNK_KEYWORD_RANK_FLOOR}`
      )
    )
    .orderBy(sql`keyword_score DESC`)
    .limit(CANDIDATES_PER_ARM)
}

async function semanticCandidates(embedding: number[], locale: string, viewer: Actor) {
  const vectorStr = `[${embedding.join(',')}]`
  const distance = sql`${helpCenterArticleChunks.embedding} <=> ${vectorStr}::vector`
  const similarity = sql<number>`1 - (${distance})`
  return chunkCandidateQuery(similarity.as('semantic_score'))
    .where(
      and(
        chunkVisibility(locale, viewer),
        sql`${helpCenterArticleChunks.embedding} IS NOT NULL`,
        sql`${similarity} > ${CHUNK_SEMANTIC_SIMILARITY_FLOOR}`
      )
    )
    .orderBy(distance)
    .limit(CANDIDATES_PER_ARM)
}

/**
 * Fuse the two arms. Exported for tests: the ordering rules are the part worth
 * pinning without a database.
 */
export function fuseCandidates(candidates: Candidate[], fusion: ChunkFusion): FusedCandidate[] {
  const rankOf = (arm: 'keyword' | 'semantic') => {
    const ranked = candidates
      .filter((c) => c[arm] !== null)
      .sort((a, b) => (b[arm] as number) - (a[arm] as number))
    return new Map(ranked.map((c, i) => [c.chunkId, i + 1]))
  }
  const keywordRank = rankOf('keyword')
  const semanticRank = rankOf('semantic')

  const scoreOf = (c: Candidate): number => {
    if (fusion === 'weighted') {
      return KEYWORD_WEIGHT * (c.keyword ?? 0) + SEMANTIC_WEIGHT * (c.semantic ?? 0)
    }
    const k = keywordRank.get(c.chunkId)
    const s = semanticRank.get(c.chunkId)
    return (k ? 1 / (RRF_K + k) : 0) + (s ? 1 / (RRF_K + s) : 0)
  }

  return candidates
    .map((c) => ({ ...c, fusedScore: scoreOf(c) }))
    .sort((a, b) => b.fusedScore - a.fusedScore)
}

export function sectionUrl(opts: {
  locale: string
  urlId: number
  slug: string
  heading: string | null
}): string {
  const anchor = opts.heading ? headingAnchor(opts.heading) : ''
  const path = hcArticlePath({ locale: opts.locale, urlId: opts.urlId, slug: opts.slug })
  return `${getBaseUrl()}${path}${anchor ? `#${anchor}` : ''}`
}

/**
 * Retrieve the sections of published, public help-center content that best
 * answer `query` in `locale`. The caller has already resolved `locale` to one
 * the help center serves.
 */
export async function searchChunks(options: SearchChunksOptions): Promise<SearchChunksResult> {
  const { query, locale, limit } = options
  const viewer = options.viewer ?? ANONYMOUS_ACTOR
  const fusion = options.fusion ?? 'rrf'

  const [keywordRows, embedding] = await Promise.all([
    keywordCandidates(query, locale, viewer),
    generateKbQueryEmbedding(query, { pipelineStep: 'kb_retrieve_query_embedding' }),
  ])
  const semanticRows = embedding ? await semanticCandidates(embedding, locale, viewer) : []

  const byChunk = new Map<string, Candidate>()
  const upsert = (row: (typeof keywordRows)[number], arm: 'keyword' | 'semantic') => {
    const existing = byChunk.get(row.chunkId) ?? {
      chunkId: row.chunkId,
      articleId: row.articleId,
      slug: row.slug,
      urlId: row.urlId,
      articleTitle: row.articleTitle,
      heading: row.heading,
      headingPath: row.headingPath,
      content: row.content,
      keyword: null,
      semantic: null,
    }
    existing[arm] = Number(row.score)
    byChunk.set(row.chunkId, existing)
  }
  for (const row of keywordRows) upsert(row, 'keyword')
  for (const row of semanticRows) upsert(row, 'semantic')

  const fused = fuseCandidates([...byChunk.values()], fusion).slice(0, limit)

  return {
    noMatch: fused.length === 0,
    sections: fused.map((c) => ({
      articleId: c.articleId,
      slug: c.slug,
      urlId: c.urlId,
      articleTitle: c.articleTitle,
      heading: c.heading,
      headingPath: c.headingPath,
      content: c.content,
      score: Number(c.fusedScore.toFixed(6)),
      url: sectionUrl({ locale, urlId: c.urlId, slug: c.slug, heading: c.heading }),
    })),
  }
}
