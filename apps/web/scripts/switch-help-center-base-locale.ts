#!/usr/bin/env bun
/**
 * Switch the help center's BASE CONTENT LOCALE — the language articles and
 * categories are authored in, which owns the unprefixed `/hc/...` URLs and is
 * the only locale with semantic (embedding) search.
 *
 * What it does, in one transaction:
 *
 *   1. Swaps content between the base tables and the target locale's
 *      translation rows: the target translation becomes the base row, and the
 *      old base content is written back as a translation in the OLD base
 *      locale. Nothing is discarded.
 *   2. Stamps `kb_articles.locale` with the new base locale so keyword search
 *      stems it with the right Postgres text-search config.
 *   3. Rewrites `settings.help_center_config.locales`: the new base becomes
 *      `default`, the old base joins `additional` (carrying the chrome strings
 *      it needs to render its own homepage), and the top-level homepage
 *      strings are replaced with the new base locale's chrome.
 *
 * Slugs are deliberately untouched — translations have never had their own
 * slug, so every article keeps the URL it has today. Only the locale PREFIX
 * moves: what was `/hc/<target>/articles/x` becomes `/hc/articles/x`. Add a
 * redirect rule for the old prefixed paths (see --print-redirects).
 *
 * Articles with no translation in the target locale keep their existing base
 * content and are reported as untranslated: they will still be served on the
 * unprefixed URLs, now labelled as the new base locale. Review them.
 *
 * Embeddings are NOT regenerated here — the stored vector describes the OLD
 * base language and is wrong the moment the content is swapped. Every swapped
 * article therefore has its `embedding` cleared (along with the model and
 * timestamp), which both stops semantic search returning old-language matches
 * and is exactly what `backfill-ai.ts --embeddings` selects on
 * (`embedding IS NULL`). Until that backfill runs, those articles are findable
 * by keyword search only.
 *
 * Usage:
 *   bun scripts/switch-help-center-base-locale.ts --to=sv --dry-run
 *   bun scripts/switch-help-center-base-locale.ts --to=sv
 *   bun scripts/switch-help-center-base-locale.ts --to=sv --print-redirects
 *
 * Environment:
 *   DATABASE_URL - Required. PostgreSQL connection string.
 */

try {
  const { config } = await import('dotenv')
  config({ path: '.env', quiet: true })
} catch {
  // dotenv not available
}

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { and, eq, isNull, sql } from 'drizzle-orm'
import {
  helpCenterArticles,
  helpCenterArticleTranslations,
  helpCenterCategories,
  helpCenterCategoryTranslations,
  settings,
} from '@quackback/db/schema'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const printRedirects = args.includes('--print-redirects')
const targetArg = args.find((a) => a.startsWith('--to='))
const targetLocale = targetArg?.split('=')[1]

if (!targetLocale) {
  console.error('Missing --to=<locale>. Example: --to=sv')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(databaseUrl)
const db = drizzle(client)

interface LocaleChrome {
  homepageTitle: string
  homepageDescription: string
  searchPlaceholder: string
}

interface HelpCenterLocales {
  default: string
  additional: string[]
  chrome: Record<string, LocaleChrome>
}

async function run() {
  const [settingsRow] = await db
    .select({ id: settings.id, helpCenterConfig: settings.helpCenterConfig })
    .from(settings)
    .limit(1)

  if (!settingsRow) {
    console.error('No settings row found — nothing to switch.')
    process.exit(1)
  }

  const helpCenterConfig =
    typeof settingsRow.helpCenterConfig === 'string'
      ? JSON.parse(settingsRow.helpCenterConfig)
      : (settingsRow.helpCenterConfig ?? {})

  const locales: HelpCenterLocales = helpCenterConfig.locales ?? {
    default: 'en',
    additional: [],
    chrome: {},
  }
  const previousBaseLocale = locales.default

  if (previousBaseLocale === targetLocale) {
    console.log(`Base locale is already "${targetLocale}". Nothing to do.`)
    return
  }
  if (!locales.additional.includes(targetLocale!)) {
    console.error(
      `"${targetLocale}" is not an enabled additional locale, so it has no translations to promote.\n` +
        `Enable it in Settings → Help center → Domains & languages first.`
    )
    process.exit(1)
  }

  // ---- Articles ----------------------------------------------------------
  const articles = await db
    .select({
      id: helpCenterArticles.id,
      slug: helpCenterArticles.slug,
      title: helpCenterArticles.title,
      description: helpCenterArticles.description,
      content: helpCenterArticles.content,
      contentJson: helpCenterArticles.contentJson,
      publishedAt: helpCenterArticles.publishedAt,
    })
    .from(helpCenterArticles)
    .where(isNull(helpCenterArticles.deletedAt))

  const targetArticleTranslations = await db
    .select()
    .from(helpCenterArticleTranslations)
    .where(eq(helpCenterArticleTranslations.locale, targetLocale!))

  const translationByArticleId = new Map(targetArticleTranslations.map((t) => [t.articleId, t]))

  const swappable = articles.filter((a) => translationByArticleId.has(a.id))
  const untranslated = articles.filter((a) => !translationByArticleId.has(a.id))

  // ---- Categories --------------------------------------------------------
  const categories = await db
    .select({
      id: helpCenterCategories.id,
      slug: helpCenterCategories.slug,
      name: helpCenterCategories.name,
      description: helpCenterCategories.description,
    })
    .from(helpCenterCategories)
    .where(isNull(helpCenterCategories.deletedAt))

  const targetCategoryTranslations = await db
    .select()
    .from(helpCenterCategoryTranslations)
    .where(eq(helpCenterCategoryTranslations.locale, targetLocale!))

  const categoryTranslationById = new Map(targetCategoryTranslations.map((t) => [t.categoryId, t]))
  const swappableCategories = categories.filter((c) => categoryTranslationById.has(c.id))
  const untranslatedCategories = categories.filter((c) => !categoryTranslationById.has(c.id))

  console.log(`Base locale: ${previousBaseLocale} → ${targetLocale}`)
  console.log(
    `Articles:   ${swappable.length} to swap, ${untranslated.length} with no ${targetLocale} translation`
  )
  console.log(
    `Categories: ${swappableCategories.length} to swap, ${untranslatedCategories.length} with no ${targetLocale} translation`
  )

  if (untranslated.length > 0) {
    console.log(`\nArticles that will stay in ${previousBaseLocale} on the unprefixed URLs:`)
    for (const article of untranslated) console.log(`  - ${article.slug} — ${article.title}`)
  }
  if (untranslatedCategories.length > 0) {
    console.log(`\nCategories that will stay in ${previousBaseLocale}:`)
    for (const category of untranslatedCategories) {
      console.log(`  - ${category.slug} — ${category.name}`)
    }
  }

  if (printRedirects) {
    console.log(`\nRedirect rules to add (old prefixed URLs → their new canonical form):`)
    console.log(`  /hc/${targetLocale}                       → /hc`)
    for (const category of categories) {
      console.log(
        `  /hc/${targetLocale}/categories/${category.slug} → /hc/categories/${category.slug}`
      )
    }
  }

  if (dryRun) {
    console.log('\nDry run — no changes written.')
    return
  }

  await db.transaction(async (tx) => {
    for (const article of swappable) {
      const translation = translationByArticleId.get(article.id)!

      // The target translation becomes the base row.
      await tx
        .update(helpCenterArticles)
        .set({
          title: translation.title,
          description: translation.description,
          content: translation.content,
          contentJson: translation.contentJson,
          locale: targetLocale!,
          // The embedding describes the old language's text, so it is wrong
          // now. Clearing it (not just its timestamp) is what makes
          // `backfill-ai.ts --embeddings` pick the article up: that query
          // selects on `embedding IS NULL`.
          embedding: null,
          embeddingModel: null,
          embeddingUpdatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(helpCenterArticles.id, article.id))

      // The old base content is preserved as a translation in the old locale.
      await tx
        .insert(helpCenterArticleTranslations)
        .values({
          articleId: article.id,
          locale: previousBaseLocale,
          title: article.title,
          description: article.description,
          content: article.content,
          contentJson: article.contentJson,
          // A previously-published base article stays publicly readable in its
          // own locale; an unpublished one stays a draft.
          status: article.publishedAt ? 'published' : 'draft',
        })
        .onConflictDoUpdate({
          target: [helpCenterArticleTranslations.articleId, helpCenterArticleTranslations.locale],
          set: {
            title: article.title,
            description: article.description,
            content: article.content,
            contentJson: article.contentJson,
            updatedAt: new Date(),
          },
        })

      // The promoted translation row would otherwise duplicate the base row.
      await tx
        .delete(helpCenterArticleTranslations)
        .where(
          and(
            eq(helpCenterArticleTranslations.articleId, article.id),
            eq(helpCenterArticleTranslations.locale, targetLocale!)
          )
        )
    }

    for (const category of swappableCategories) {
      const translation = categoryTranslationById.get(category.id)!

      await tx
        .update(helpCenterCategories)
        .set({
          name: translation.name,
          description: translation.description,
          updatedAt: new Date(),
        })
        .where(eq(helpCenterCategories.id, category.id))

      await tx
        .insert(helpCenterCategoryTranslations)
        .values({
          categoryId: category.id,
          locale: previousBaseLocale,
          name: category.name,
          description: category.description,
        })
        .onConflictDoUpdate({
          target: [
            helpCenterCategoryTranslations.categoryId,
            helpCenterCategoryTranslations.locale,
          ],
          set: {
            name: category.name,
            description: category.description,
            updatedAt: new Date(),
          },
        })

      await tx
        .delete(helpCenterCategoryTranslations)
        .where(
          and(
            eq(helpCenterCategoryTranslations.categoryId, category.id),
            eq(helpCenterCategoryTranslations.locale, targetLocale!)
          )
        )
    }

    // Articles with no translation keep their content but must still declare
    // the language they are actually written in, or search would stem them
    // with the new base locale's rules.
    if (untranslated.length > 0) {
      await tx
        .update(helpCenterArticles)
        .set({ locale: previousBaseLocale })
        .where(
          and(
            isNull(helpCenterArticles.deletedAt),
            sql`${helpCenterArticles.locale} <> ${previousBaseLocale}`,
            sql`${helpCenterArticles.id} IN ${sql.raw(
              `(${untranslated.map((a) => `'${a.id}'`).join(',')})`
            )}`
          )
        )
    }

    // The new base locale needs no chrome entry (it uses the top-level
    // homepage strings); the old base locale now does.
    const targetChrome = locales.chrome[targetLocale!]
    const nextChrome: Record<string, LocaleChrome> = { ...locales.chrome }
    delete nextChrome[targetLocale!]
    nextChrome[previousBaseLocale] = {
      homepageTitle: helpCenterConfig.homepageTitle ?? '',
      homepageDescription: helpCenterConfig.homepageDescription ?? '',
      searchPlaceholder: helpCenterConfig.searchPlaceholder ?? '',
    }

    const nextConfig = {
      ...helpCenterConfig,
      // The top-level homepage strings are the BASE locale's chrome.
      homepageTitle: targetChrome?.homepageTitle || helpCenterConfig.homepageTitle,
      homepageDescription:
        targetChrome?.homepageDescription || helpCenterConfig.homepageDescription,
      searchPlaceholder: targetChrome?.searchPlaceholder || helpCenterConfig.searchPlaceholder,
      locales: {
        default: targetLocale,
        additional: [...locales.additional.filter((l) => l !== targetLocale), previousBaseLocale],
        chrome: nextChrome,
      },
    }

    await tx
      .update(settings)
      .set({ helpCenterConfig: JSON.stringify(nextConfig) })
      .where(eq(settings.id, settingsRow.id))
  })

  console.log('\nDone. Next steps:')
  console.log(
    `  1. Add a redirect for /hc/${targetLocale}/* → /hc/* (--print-redirects lists them)`
  )
  console.log(
    `  2. Rebuild article embeddings: bun /app/backfill-ai.mjs --embeddings (${swappable.length} cleared)`
  )
  console.log('  3. Review the untranslated articles listed above')
}

await run()
await client.end()
