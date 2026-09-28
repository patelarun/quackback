/**
 * Help Center Chunk Index Service
 *
 * Keeps kb_article_chunks in step with the articles and translations it is
 * derived from. Called fire-and-forget from the article and translation
 * services (like the whole-article embedding), and by the backfill script.
 *
 * Re-embedding is the expensive part, so it happens only when needed: a chunk
 * keeps its stored vector when a chunk with the same content hash already has
 * one from the current embedding model -- at any position, so inserting a
 * section near the top of an article does not re-embed every section after it.
 *
 * Soft-deleting an article leaves its chunks in place: every reader joins back
 * to kb_articles and filters deleted rows, so they are already invisible, and a
 * restore within the 30-day window then needs no re-embedding. A hard delete
 * cascades through the foreign key.
 */

import {
  db,
  helpCenterArticles,
  helpCenterArticleTranslations,
  helpCenterArticleChunks,
  and,
  eq,
  gte,
  notInArray,
  sql,
} from '@/lib/server/db'
import type { KbArticleId } from '@quackback/ids'
import { getEmbeddingModel } from '@/lib/server/domains/ai/models'
import { logger } from '@/lib/server/logger'
import { chunkArticle } from './help-center-chunking.service'
import { generateKbEmbedding } from './help-center-embedding.service'

const log = logger.child({ component: 'help-center-chunk-index' })

export interface ReindexResult {
  chunks: number
  embedded: number
  reused: number
}

const EMPTY_RESULT: ReindexResult = { chunks: 0, embedded: 0, reused: 0 }

/**
 * Rebuild one article's chunks for one locale from its current source: the
 * base row when `locale` is the article's own locale, otherwise that locale's
 * translation row. A missing source (no such translation) clears the locale.
 */
export async function reindexArticleLocale(
  articleId: KbArticleId,
  locale: string
): Promise<ReindexResult> {
  const article = await db.query.helpCenterArticles.findFirst({
    where: eq(helpCenterArticles.id, articleId),
    columns: { id: true, locale: true, title: true, content: true },
  })
  if (!article) return EMPTY_RESULT

  let source: { title: string; content: string } | null = article
  if (locale !== article.locale) {
    source =
      (await db.query.helpCenterArticleTranslations.findFirst({
        where: and(
          eq(helpCenterArticleTranslations.articleId, articleId),
          eq(helpCenterArticleTranslations.locale, locale)
        ),
        columns: { title: true, content: true },
      })) ?? null
  }

  if (!source || !source.content.trim()) {
    await deleteArticleLocaleChunks(articleId, locale)
    return EMPTY_RESULT
  }

  const chunks = chunkArticle(source.title, source.content)
  const model = getEmbeddingModel()

  // Vectors already stored for this article+locale, by content hash. Read as
  // text so they can be written back verbatim without a float round-trip.
  const existing = await db
    .select({
      contentHash: helpCenterArticleChunks.contentHash,
      embedding: sql<string | null>`${helpCenterArticleChunks.embedding}::text`,
      embeddingModel: helpCenterArticleChunks.embeddingModel,
    })
    .from(helpCenterArticleChunks)
    .where(
      and(
        eq(helpCenterArticleChunks.articleId, articleId),
        eq(helpCenterArticleChunks.locale, locale)
      )
    )
  const storedVectorByHash = new Map<string, string>()
  for (const row of existing) {
    if (row.embedding && model && row.embeddingModel === model) {
      storedVectorByHash.set(row.contentHash, row.embedding)
    }
  }

  // Embed outside the write transaction: provider calls are slow and may fail.
  let embedded = 0
  let reused = 0
  const vectors: (string | null)[] = []
  for (const chunk of chunks) {
    const stored = storedVectorByHash.get(chunk.contentHash)
    if (stored) {
      vectors.push(stored)
      reused++
      continue
    }
    const embedding = await generateKbEmbedding(chunk.embeddingInput, {
      pipelineStep: 'kb_chunk_embedding',
      metadata: { kbArticleId: articleId, locale, position: chunk.position },
    })
    // A null embedding (AI not configured, provider down) still indexes the
    // chunk for keyword search; the next reindex retries the vector.
    vectors.push(embedding ? `[${embedding.join(',')}]` : null)
    if (embedding) embedded++
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(helpCenterArticleChunks)
      .where(
        and(
          eq(helpCenterArticleChunks.articleId, articleId),
          eq(helpCenterArticleChunks.locale, locale),
          gte(helpCenterArticleChunks.position, chunks.length)
        )
      )

    for (const [i, chunk] of chunks.entries()) {
      const vector = vectors[i]
      const values = {
        heading: chunk.heading,
        headingPath: chunk.headingPath,
        content: chunk.content,
        contentHash: chunk.contentHash,
        tokenCount: chunk.tokenCount,
        embedding: vector === null ? null : sql`${vector}::vector`,
        embeddingModel: vector === null ? null : model,
        updatedAt: new Date(),
      }
      await tx
        .insert(helpCenterArticleChunks)
        .values({ articleId, locale, position: chunk.position, ...values })
        .onConflictDoUpdate({
          target: [
            helpCenterArticleChunks.articleId,
            helpCenterArticleChunks.locale,
            helpCenterArticleChunks.position,
          ],
          set: values,
        })
    }
  })

  return { chunks: chunks.length, embedded, reused }
}

/**
 * Rebuild every locale of an article -- its own locale and each translation --
 * and drop chunks for any locale that no longer has a source (a translation
 * deleted while the index was not listening, or a changed base locale).
 */
export async function reindexArticle(articleId: KbArticleId): Promise<ReindexResult> {
  const article = await db.query.helpCenterArticles.findFirst({
    where: eq(helpCenterArticles.id, articleId),
    columns: { locale: true },
  })
  if (!article) return EMPTY_RESULT

  const translations = await db
    .select({ locale: helpCenterArticleTranslations.locale })
    .from(helpCenterArticleTranslations)
    .where(eq(helpCenterArticleTranslations.articleId, articleId))
  const locales = [article.locale, ...translations.map((t) => t.locale)]

  await db
    .delete(helpCenterArticleChunks)
    .where(
      and(
        eq(helpCenterArticleChunks.articleId, articleId),
        notInArray(helpCenterArticleChunks.locale, locales)
      )
    )

  const total = { ...EMPTY_RESULT }
  for (const locale of locales) {
    const result = await reindexArticleLocale(articleId, locale)
    total.chunks += result.chunks
    total.embedded += result.embedded
    total.reused += result.reused
  }
  return total
}

export async function deleteArticleLocaleChunks(
  articleId: KbArticleId,
  locale: string
): Promise<void> {
  await db
    .delete(helpCenterArticleChunks)
    .where(
      and(
        eq(helpCenterArticleChunks.articleId, articleId),
        eq(helpCenterArticleChunks.locale, locale)
      )
    )
}

/**
 * Fire-and-forget wrapper for the write paths: a failed reindex must never fail
 * the save that triggered it. The next save, or the backfill, repairs it.
 */
export function queueReindexArticleLocale(articleId: KbArticleId, locale: string): void {
  reindexArticleLocale(articleId, locale).catch((err) =>
    log.error({ article_id: articleId, locale, err }, 'article chunk reindex failed')
  )
}
