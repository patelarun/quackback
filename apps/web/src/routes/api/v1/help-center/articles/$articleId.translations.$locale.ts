/**
 * Read, write and remove one locale's translation of a help-center article
 * over the public REST API (domains/languages §2).
 *
 * The admin UI and the auto-translator could already write these rows; an API
 * key could not, because the translation surface existed only as server
 * functions behind a session cookie. This route closes that gap so a
 * documentation repository can own its own translated copy -- bos-v3 publishes
 * `product-docs/en/**` as the base article and `product-docs/sv/**` through
 * here -- instead of depending on machine translation for a language it
 * already writes by hand.
 *
 * Every handler requires HELP_CENTER_MANAGE, the read included. A translation
 * row is not public-tier data the way a published article is: it can be a
 * draft holding unreviewed machine output or work in progress, so a bare
 * `withApiKeyAuth(request)` would hand those drafts to any valid key.
 *
 * **Auto-translate must stay off for any locale synced through here.**
 * `queueAutoTranslateOnPublish` queues a job for every enabled additional
 * locale without checking whether a translation already exists, and the job
 * writes through `upsertArticleTranslation`, which replaces title, description
 * and content while leaving `status` untouched. Publishing the base article
 * would therefore overwrite reviewed human copy with machine output *in place,
 * on a live page*.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import { PERMISSIONS } from '@/lib/shared/permissions'
import {
  successResponse,
  noContentResponse,
  badRequestResponse,
  notFoundResponse,
  handleDomainError,
} from '@/lib/server/domains/api/responses'
import { parseTypeId } from '@/lib/server/domains/api/validation'
import { isFeatureEnabled } from '@/lib/server/domains/settings/settings.service'
import { resolveWritableHelpCenterLocale } from '@/lib/server/domains/api/help-center-locale'
import { getArticleById } from '@/lib/server/domains/help-center/help-center.service'
import {
  getArticleTranslation,
  upsertArticleTranslation,
  setArticleTranslationStatus,
  deleteArticleTranslation,
} from '@/lib/server/domains/help-center/help-center-translations.service'
import type { HelpCenterArticleTranslation } from '@/lib/server/domains/help-center/help-center.types'
import type { KbArticleId } from '@quackback/ids'

const upsertTranslationBody = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  description: z.string().max(300).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

function formatTranslation(translation: HelpCenterArticleTranslation) {
  return {
    id: translation.id,
    articleId: translation.articleId,
    locale: translation.locale,
    title: translation.title,
    description: translation.description,
    // Markdown as stored: unlike the base article there is no separate
    // projection step, because `upsertArticleTranslation` derives contentJson
    // from this string rather than the other way round.
    content: translation.content,
    status: translation.status,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: translation.updatedAt.toISOString(),
  }
}

export const Route = createFileRoute(
  '/api/v1/help-center/articles/$articleId/translations/$locale'
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const articleId = parseTypeId<KbArticleId>(params.articleId, 'kb_article', 'article ID')
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          const translation = await getArticleTranslation(articleId, locale)
          if (!translation) return notFoundResponse('Help center article translation')

          return successResponse(formatTranslation(translation))
        } catch (error) {
          return handleDomainError(error)
        }
      },

      /**
       * Create or replace this locale's translation.
       *
       * Idempotent, and always 200: an upsert has no created/updated
       * distinction to report without a second read, and a synchronising
       * client has no use for one.
       */
      PUT: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const articleId = parseTypeId<KbArticleId>(params.articleId, 'kb_article', 'article ID')
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          const body = await request.json()
          const parsed = upsertTranslationBody.safeParse(body)

          if (!parsed.success) {
            return badRequestResponse('Invalid request body', {
              errors: parsed.error.flatten().fieldErrors,
            })
          }

          // The row carries a foreign key to kb_articles. Resolving the article
          // first turns an unknown id into a 404 rather than a constraint
          // violation surfacing as a 500.
          await getArticleById(articleId)

          const { status: requestedStatus, ...translatedFields } = parsed.data

          const savedTranslation = await upsertArticleTranslation({
            articleId,
            locale,
            ...translatedFields,
          })

          // `upsertArticleTranslation` leaves `status` alone on conflict, so
          // omitting it re-syncs a live translation's copy without taking the
          // page down, and a new row stays the draft it was created as until
          // asked otherwise.
          if (requestedStatus && requestedStatus !== savedTranslation.status) {
            const restatusedTranslation = await setArticleTranslationStatus(
              articleId,
              locale,
              requestedStatus
            )
            return successResponse(formatTranslation(restatusedTranslation))
          }

          return successResponse(formatTranslation(savedTranslation))
        } catch (error) {
          return handleDomainError(error)
        }
      },

      /**
       * Remove this locale's translation. Idempotent: deleting a translation
       * that was never written is a 204, not a 404, so a sync reconciling a
       * deleted source file need not read before it writes.
       */
      DELETE: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const articleId = parseTypeId<KbArticleId>(params.articleId, 'kb_article', 'article ID')
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          await deleteArticleTranslation(articleId, locale)
          return noContentResponse()
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
