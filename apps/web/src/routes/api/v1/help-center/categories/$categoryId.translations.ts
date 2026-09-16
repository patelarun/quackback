/**
 * Every locale a help-center category has been translated into
 * (domains/languages §2).
 *
 * The reconcile call for categories: one request tells a synchronising client
 * which locales already carry a name, so it writes only what changed rather
 * than one request per locale per run.
 *
 * Rows are returned for every locale on the category, including any whose
 * locale is no longer enabled on the help center. Those are invisible to
 * readers but still stored, and hiding them here would make an orphan
 * impossible to find through the API that has to clean it up.
 */
import { createFileRoute } from '@tanstack/react-router'
import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import { PERMISSIONS } from '@/lib/shared/permissions'
import {
  successResponse,
  notFoundResponse,
  handleDomainError,
} from '@/lib/server/domains/api/responses'
import { parseTypeId } from '@/lib/server/domains/api/validation'
import { isFeatureEnabled } from '@/lib/server/domains/settings/settings.service'
import { getCategoryById } from '@/lib/server/domains/help-center/help-center.service'
import { listCategoryTranslations } from '@/lib/server/domains/help-center/help-center-translations.service'
import type { HelpCenterCategoryTranslation } from '@/lib/server/domains/help-center/help-center.types'
import type { KbCategoryId } from '@quackback/ids'

function formatCategoryTranslationSummary(translation: HelpCenterCategoryTranslation) {
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

export const Route = createFileRoute('/api/v1/help-center/categories/$categoryId/translations')({
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

          // An unknown category and one with no translations both list as
          // empty, so resolve the category to tell those two apart with a 404.
          await getCategoryById(categoryId)

          const translations = await listCategoryTranslations(categoryId)
          return successResponse(translations.map(formatCategoryTranslationSummary))
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
