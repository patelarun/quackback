/**
 * OpenAPI documentation for the fork's help-center sync surface: per-locale
 * translations (bos-v3 syncs product-docs/sv through these) and chunk
 * retrieval for the bos AI assistant. Kept apart from upstream's
 * help-center.ts so upstream merges stay clean and both files stay under
 * the max-lines limit.
 */
import 'zod-openapi'
import { z } from 'zod'
import {
  registerPath,
  TypeIdSchema,
  createItemResponseSchema,
  createRequestBodySchema,
  asSchema,
} from '../openapi'
import { TimestampSchema, UnauthorizedErrorSchema, NotFoundErrorSchema } from './common'
import { errorResponses } from './errors'
import { MANAGE, featureOff, categoryIdParam, articleIdParam } from './help-center'

// ============================================================================
// Fork: per-locale translations (bos-v3 syncs product-docs/sv through these).
// Every handler, the reads included, requires help_center.manage: a
// translation row can be an unreviewed draft, so it is not public-tier data.
// ============================================================================

const localeParam = {
  name: 'locale',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Content locale (must be the help center default or an enabled additional locale)',
} as const

const translationTimestamps = {
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
}

const ArticleTranslationSummarySchema = z
  .object({
    id: TypeIdSchema,
    articleId: TypeIdSchema,
    locale: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(['draft', 'published']),
    ...translationTimestamps,
  })
  .meta({ id: 'HelpCenterArticleTranslationSummary' })

const ArticleTranslationSchema = ArticleTranslationSummarySchema.extend({
  content: z.string().meta({ description: 'Translated body as markdown' }),
}).meta({ id: 'HelpCenterArticleTranslation' })

const UpsertArticleTranslationBodySchema = createRequestBodySchema({
  title: z.string().min(1).max(200),
  content: z.string().min(1).meta({ description: 'Translated body as markdown' }),
  description: z.string().max(300).optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const CategoryTranslationSchema = z
  .object({
    id: TypeIdSchema,
    categoryId: TypeIdSchema,
    locale: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    ...translationTimestamps,
  })
  .meta({ id: 'HelpCenterCategoryTranslation' })

const UpsertCategoryTranslationBodySchema = createRequestBodySchema({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})

registerPath('/help-center/articles/{articleId}/translations', {
  get: {
    tags: ['Help Center'],
    summary: "List an article's translations",
    description: MANAGE,
    parameters: [articleIdParam],
    responses: {
      200: {
        description: 'Translations of the article, without bodies',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(ArticleTranslationSummarySchema) }),
          },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
})

registerPath('/help-center/articles/{articleId}/translations/{locale}', {
  get: {
    tags: ['Help Center'],
    summary: "Get an article's translation",
    description: MANAGE,
    parameters: [articleIdParam, localeParam],
    responses: {
      200: {
        description: 'The translation',
        content: {
          'application/json': {
            schema: createItemResponseSchema(ArticleTranslationSchema, 'ArticleTranslation'),
          },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
  put: {
    tags: ['Help Center'],
    summary: "Create or replace an article's translation",
    description: `${MANAGE} Keep auto-translate off for any locale synced through this endpoint, or publishing the base article overwrites the synced copy.`,
    parameters: [articleIdParam, localeParam],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: asSchema(UpsertArticleTranslationBodySchema) } },
    },
    responses: {
      200: {
        description: 'The saved translation',
        content: {
          'application/json': {
            schema: createItemResponseSchema(ArticleTranslationSchema, 'ArticleTranslation'),
          },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
  delete: {
    tags: ['Help Center'],
    summary: "Delete an article's translation",
    description: MANAGE,
    parameters: [articleIdParam, localeParam],
    responses: {
      204: { description: 'Translation deleted' },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
})

registerPath('/help-center/categories/{categoryId}/translations', {
  get: {
    tags: ['Help Center'],
    summary: "List a category's translations",
    description: MANAGE,
    parameters: [categoryIdParam],
    responses: {
      200: {
        description: 'Translations of the category',
        content: {
          'application/json': { schema: z.object({ data: z.array(CategoryTranslationSchema) }) },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
})

registerPath('/help-center/categories/{categoryId}/translations/{locale}', {
  get: {
    tags: ['Help Center'],
    summary: "Get a category's translation",
    description: MANAGE,
    parameters: [categoryIdParam, localeParam],
    responses: {
      200: {
        description: 'The translation',
        content: {
          'application/json': {
            schema: createItemResponseSchema(CategoryTranslationSchema, 'CategoryTranslation'),
          },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
  put: {
    tags: ['Help Center'],
    summary: "Create or replace a category's translation",
    description: MANAGE,
    parameters: [categoryIdParam, localeParam],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: asSchema(UpsertCategoryTranslationBodySchema) } },
    },
    responses: {
      200: {
        description: 'The saved translation',
        content: {
          'application/json': {
            schema: createItemResponseSchema(CategoryTranslationSchema, 'CategoryTranslation'),
          },
        },
      },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
  delete: {
    tags: ['Help Center'],
    summary: "Delete a category's translation",
    description: MANAGE,
    parameters: [categoryIdParam, localeParam],
    responses: {
      204: { description: 'Translation deleted' },
      ...errorResponses(400, 403),
      ...featureOff,
    },
  },
})

// ============================================================================
// Fork: help-center retrieval (chunk search used by the bos AI assistant)
// ============================================================================

const ErrorSchema = (description: string) =>
  z
    .object({
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      }),
    })
    .meta({ description })

const RetrieveRequestSchema = z
  .object({
    query: z.string().min(1).max(500).meta({
      description: 'The question, phrased to stand alone',
      example: 'Hur lägger jag till en användare?',
    }),
    locale: z.string().optional().meta({
      description: "Locale to search. Defaults to the help center's base locale.",
      example: 'sv',
    }),
    limit: z.number().int().min(1).max(8).optional().meta({
      description: 'Maximum sections to return',
      default: 4,
    }),
    fusion: z
      .enum(['rrf', 'weighted'])
      .optional()
      .meta({
        description:
          'How the keyword and semantic rankings are combined: reciprocal rank fusion, or the ' +
          "article search's 0.4 keyword / 0.6 semantic blend",
        default: 'weighted',
      }),
  })
  .meta({ description: 'Retrieve request body' })

const RetrievedSectionSchema = z.object({
  articleId: TypeIdSchema.meta({ example: 'kb_article_01h455vb4pex5vsknk084sn02q' }),
  slug: z.string().meta({ example: 'users' }),
  urlId: z.number().int().meta({ example: 12 }),
  articleTitle: z.string().meta({ example: 'Användare' }),
  heading: z.string().nullable().meta({ example: 'Lägg till en användare' }),
  headingPath: z.string().meta({ example: 'Användare › Hur gör jag? › Lägg till en användare' }),
  content: z.string().meta({ description: "The section's Markdown" }),
  score: z
    .number()
    .meta({ description: 'Relative rank within this response; not comparable across queries' }),
  url: z.string().meta({
    description: 'Public article URL, anchored at the section',
    example: 'https://feedback.example.com/hc/sv/articles/12-users#l-gg-till-en-anv-ndare',
  }),
})

const RetrieveResultSchema = z.object({
  sections: z.array(RetrievedSectionSchema),
  noMatch: z.boolean().meta({ description: 'True when nothing cleared the relevance floor' }),
})

registerPath('/help-center/retrieve', {
  post: {
    tags: ['Help Center'],
    summary: 'Retrieve help-center sections',
    description:
      'Returns the published, public help-center sections that best answer a question, for the ' +
      "caller's own model to answer from. Retrieval only: no text is generated. Requires the " +
      '`read:article` scope.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: asSchema(RetrieveRequestSchema) } },
    },
    responses: {
      200: {
        description: 'Matching sections, best first',
        content: {
          'application/json': {
            schema: createItemResponseSchema(RetrieveResultSchema, 'Retrieved sections'),
          },
        },
      },
      400: {
        description: 'Invalid body, or a locale the help center does not serve',
        content: { 'application/json': { schema: ErrorSchema('Bad request') } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: UnauthorizedErrorSchema } },
      },
      403: {
        description: "The API key lacks the 'read:article' scope",
        content: { 'application/json': { schema: ErrorSchema('Forbidden') } },
      },
      404: {
        description: 'The help center is not enabled',
        content: { 'application/json': { schema: NotFoundErrorSchema } },
      },
    },
  },
})
