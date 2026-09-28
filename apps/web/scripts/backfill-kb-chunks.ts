#!/usr/bin/env bun
/**
 * Backfill the help-center section index (kb_article_chunks) for every
 * non-deleted article: its own locale and every translation.
 *
 * Safe to re-run. It goes through the same reindexArticle the save hooks use,
 * so a chunk whose content hash is unchanged keeps its vector and costs no
 * embedding call; a second run over an unchanged help center embeds nothing.
 * Run it once after migration 0275, after a base-locale switch, and after
 * changing AI_EMBEDDING_MODEL (a vector from another model is never reused).
 *
 * Usage:
 *   bun scripts/backfill-kb-chunks.ts              # every article
 *   bun scripts/backfill-kb-chunks.ts --dry-run    # count what would be indexed
 *   bun scripts/backfill-kb-chunks.ts --article=kb_article_01h...
 *
 * Environment: the app's own. DATABASE_URL is required. Without OPENAI_API_KEY,
 * OPENAI_BASE_URL and AI_EMBEDDING_MODEL the chunks are still written, for
 * keyword search only, and the next run fills in the vectors.
 */

try {
  const { config } = await import('dotenv')
  config({ path: '.env', quiet: true })
} catch {
  // dotenv not available
}

import { and, eq, isNull } from 'drizzle-orm'
import { createDb } from '@quackback/db/client'
import { helpCenterArticles, helpCenterArticleTranslations } from '@quackback/db/schema'
import type { KbArticleId } from '@quackback/ids'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const onlyArticle = args.find((a) => a.startsWith('--article='))?.split('=')[1]

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

// The index service reads the app's global `db`; point it at this script's own
// connection so the pool can be closed when the run ends.
const db = createDb(process.env.DATABASE_URL, { max: 2 })
;(globalThis as Record<string, unknown>).__db = db

const { reindexArticle } =
  await import('../src/lib/server/domains/help-center/help-center-chunk-index.service')
const { getEmbeddingModel } = await import('../src/lib/server/domains/ai/models')

const articles = await db
  .select({ id: helpCenterArticles.id, slug: helpCenterArticles.slug })
  .from(helpCenterArticles)
  .where(
    and(
      isNull(helpCenterArticles.deletedAt),
      onlyArticle ? eq(helpCenterArticles.id, onlyArticle as KbArticleId) : undefined
    )
  )
  .orderBy(helpCenterArticles.slug)

const model = getEmbeddingModel()
console.log(
  `${articles.length} article(s); embedding model: ${model ?? 'none (keyword-only chunks)'}` +
    (dryRun ? ' — dry run, nothing written' : '')
)

if (dryRun) {
  const translations = await db
    .select({ articleId: helpCenterArticleTranslations.articleId })
    .from(helpCenterArticleTranslations)
  const ids = new Set(articles.map((a) => a.id as string))
  const translationCount = translations.filter((t) => ids.has(t.articleId)).length
  console.log(
    `would index ${articles.length} base locale(s) and ${translationCount} translation(s)`
  )
} else {
  const totals = { chunks: 0, embedded: 0, reused: 0, failed: 0 }
  for (const article of articles) {
    try {
      const result = await reindexArticle(article.id)
      totals.chunks += result.chunks
      totals.embedded += result.embedded
      totals.reused += result.reused
      console.log(
        `  ${article.slug}: ${result.chunks} chunk(s), ${result.embedded} embedded, ${result.reused} reused`
      )
    } catch (error) {
      totals.failed++
      console.error(`  ${article.slug}: FAILED`, error)
    }
  }
  console.log(
    `done: ${totals.chunks} chunk(s), ${totals.embedded} embedded, ${totals.reused} reused, ` +
      `${totals.failed} article(s) failed`
  )
  if (totals.failed > 0) process.exitCode = 1
}

const raw = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client
await raw?.end?.()
