/**
 * Read, write and remove one locale's translation of a help-center category
 * (domains/languages §2).
 *
 * The companion to the article translation route, and the reason a translated
 * help center does not read half in one language: categories are its top-level
 * navigation, so an article translated into Swedish still sits under an English
 * heading until this row exists.
 *
 * Unlike an article translation there is no `status` here -- the table has no
 * such column. A category is translated in a locale exactly when a row with a
 * non-empty name exists, which is also the homepage visibility gate
 * (domains/languages §1). Writing one publishes it.
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
import { getCategoryById } from '@/lib/server/domains/help-center/help-center.service'
import {
  getCategoryTranslation,
  upsertCategoryTranslation,
  deleteCategoryTranslation,
} from '@/lib/server/domains/help-center/help-center-translations.service'
import type { HelpCenterCategoryTranslation } from '@/lib/server/domains/help-center/help-center.types'
import type { KbCategoryId } from '@quackback/ids'

const upsertCategoryTranslationBody = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
})

function formatCategoryTranslation(translation: HelpCenterCategoryTranslation) {
  return {
    id: translation.id,
    categoryId: translation.categoryId,
    locale: translation.locale,
    name: translation.name,
    description: translation.description,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: translation.updatedAt.toISOString(),
  }
}

export const Route = createFileRoute(
  '/api/v1/help-center/categories/$categoryId/translations/$locale'
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const categoryId = parseTypeId<KbCategoryId>(
            params.categoryId,
            'kb_category',
            'category ID'
          )
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          const translation = await getCategoryTranslation(categoryId, locale)
          if (!translation) return notFoundResponse('Help center category translation')

          return successResponse(formatCategoryTranslation(translation))
        } catch (error) {
          return handleDomainError(error)
        }
      },

      /** Create or replace this locale's name and description. Idempotent. */
      PUT: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const categoryId = parseTypeId<KbCategoryId>(
            params.categoryId,
            'kb_category',
            'category ID'
          )
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          const body = await request.json()
          const parsed = upsertCategoryTranslationBody.safeParse(body)

          if (!parsed.success) {
            return badRequestResponse('Invalid request body', {
              errors: parsed.error.flatten().fieldErrors,
            })
          }

          // The row carries a foreign key to kb_categories. Resolving the
          // category first turns an unknown id into a 404 rather than a
          // constraint violation surfacing as a 500.
          await getCategoryById(categoryId)

          const savedTranslation = await upsertCategoryTranslation({
            categoryId,
            locale,
            ...parsed.data,
          })

          return successResponse(formatCategoryTranslation(savedTranslation))
        } catch (error) {
          return handleDomainError(error)
        }
      },

      /**
       * Remove this locale's translation, which also removes the category from
       * that locale's homepage. Idempotent: deleting one that was never written
       * is a 204, not a 404.
       */
      DELETE: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const categoryId = parseTypeId<KbCategoryId>(
            params.categoryId,
            'kb_category',
            'category ID'
          )
          const locale = await resolveWritableHelpCenterLocale(params.locale)

          await deleteCategoryTranslation(categoryId, locale)
          return noContentResponse()
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
