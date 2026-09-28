/**
 * Help Center API Schema Registrations
 *
 * Only the retrieval endpoint so far; the article and category CRUD routes
 * predate this file and are not documented here yet.
 */
import 'zod-openapi'
import { z } from 'zod'
import { registerPath, TypeIdSchema, createItemResponseSchema, asSchema } from '../openapi'
import { UnauthorizedErrorSchema, NotFoundErrorSchema } from './common'

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
        default: 'rrf',
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
