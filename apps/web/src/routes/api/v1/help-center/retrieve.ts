/**
 * Section retrieval for an external assistant: the few help-center sections
 * that best answer a question, for the caller's own model to answer from.
 * Retrieval only -- nothing here generates text (that is `kb-ask`, which is a
 * different product: a second model answering inside the caller's).
 *
 * Only published, public, ungated content is ever returned: the viewer is
 * ANONYMOUS_ACTOR, so segment-gated articles and categories stay out even for a
 * key whose owner could see them in the admin. The GET routes beside this one
 * default to team audience and return drafts; do not copy them.
 *
 * Requires the `read:article` scope explicitly. The sibling GET routes accept
 * any valid key; a key minted for retrieval should need nothing more than this.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import { hasApiScope } from '@/lib/server/domains/api-keys/api-key-scopes'
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
  handleDomainError,
} from '@/lib/server/domains/api/responses'
import {
  getHelpCenterConfig,
  isFeatureEnabled,
} from '@/lib/server/domains/settings/settings.service'
import { searchChunks } from '@/lib/server/domains/help-center/help-center-chunk-search.service'
import { ANONYMOUS_ACTOR } from '@/lib/server/policy/types'

const RETRIEVE_MAX_QUERY_LENGTH = 500
const RETRIEVE_DEFAULT_LIMIT = 4
const RETRIEVE_MAX_LIMIT = 8

const retrieveBody = z.object({
  query: z.string().trim().min(1, 'Query is required').max(RETRIEVE_MAX_QUERY_LENGTH),
  /** Omitted → the help center's base locale. */
  locale: z.string().trim().toLowerCase().optional(),
  limit: z.number().int().min(1).max(RETRIEVE_MAX_LIMIT).optional(),
  /** Ranking method: `weighted` (default, the 0.4/0.6 blend) or `rrf`, kept for comparison. */
  fusion: z.enum(['rrf', 'weighted']).optional(),
})

export const Route = createFileRoute('/api/v1/help-center/retrieve')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isFeatureEnabled('helpCenter'))) return notFoundResponse('Knowledge base')

        try {
          const auth = await withApiKeyAuth(request)
          if (!hasApiScope(auth.apiKey.scopes, 'read:article')) {
            return forbiddenResponse("This API key is missing the 'read:article' scope")
          }

          let body: unknown
          try {
            body = await request.json()
          } catch {
            return badRequestResponse('Request body must be JSON')
          }
          const parsed = retrieveBody.safeParse(body)
          if (!parsed.success) {
            return badRequestResponse('Invalid request body', {
              errors: parsed.error.flatten().fieldErrors,
            })
          }

          // An explicit locale the help center does not serve is a caller error,
          // not a reason to search another language silently.
          const { locales } = await getHelpCenterConfig()
          const locale = parsed.data.locale ?? locales.default
          if (locale !== locales.default && !locales.additional.includes(locale)) {
            return badRequestResponse(`Locale '${locale}' is not enabled for this help center`, {
              enabledLocales: [locales.default, ...locales.additional],
            })
          }

          const result = await searchChunks({
            query: parsed.data.query,
            locale,
            limit: parsed.data.limit ?? RETRIEVE_DEFAULT_LIMIT,
            viewer: ANONYMOUS_ACTOR,
            fusion: parsed.data.fusion,
          })

          return successResponse(result)
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
