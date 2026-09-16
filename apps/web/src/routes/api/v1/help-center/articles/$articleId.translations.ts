/**
 * Every locale an article has been translated into (domains/languages §2).
 *
 * The companion to `$articleId.translations.$locale.ts`, and the call a
 * synchronising client makes to reconcile: it reports the rows that exist,
 * their status and when each was last written, so the client can tell an
 * untranslated article from a stale one without a request per locale.
 *
 * Rows are returned for every locale on the article, including any whose
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
import { getArticleById } from '@/lib/server/domains/help-center/help-center.service'
import { listArticleTranslations } from '@/lib/server/domains/help-center/help-center-translations.service'
import type { HelpCenterArticleTranslation } from '@/lib/server/domains/help-center/help-center.types'
import type { KbArticleId } from '@quackback/ids'

/**
 * The list omits `content`: a reconcile needs to know which locales exist and
 * how fresh each one is, and returning every translated body of every article
 * would make that answer expensive. Read one locale for its content.
 */
function formatTranslationSummary(translation: HelpCenterArticleTranslation) {
  return {
    id: translation.id,
    articleId: translation.articleId,
    locale: translation.locale,
    title: translation.title,
    description: translation.description,
    status: translation.status,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: translation.updatedAt.toISOString(),
  }
}

export const Route = createFileRoute('/api/v1/help-center/articles/$articleId/translations')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          await withApiKeyAuth(request, { permission: PERMISSIONS.HELP_CENTER_MANAGE })

          const articleId = parseTypeId<KbArticleId>(params.articleId, 'kb_article', 'article ID')

          // An unknown article and one with no translations both list as empty,
          // so resolve the article to tell those two apart with a 404.
          await getArticleById(articleId)

          const translations = await listArticleTranslations(articleId)
          return successResponse(translations.map(formatTranslationSummary))
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
