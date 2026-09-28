-- Section-level retrieval index for the help center: one row per `##` section
-- per locale, for the base article and every translation alike. Backs
-- POST /api/v1/help-center/retrieve.
--
-- Additive only: a new table and its indexes. Rows are derived data, written by
-- help-center-chunk-index.service and by the backfill script
-- (apps/web/scripts/backfill-kb-chunks.ts); nothing reads the table until that
-- has run, and an empty table simply retrieves nothing.
CREATE TABLE IF NOT EXISTS "kb_article_chunks" (
  "id" uuid PRIMARY KEY NOT NULL,
  "article_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "position" integer NOT NULL,
  "heading" text,
  "heading_path" text NOT NULL,
  "content" text NOT NULL,
  "content_hash" text NOT NULL,
  "token_count" integer NOT NULL,
  "embedding" vector(1536),
  "embedding_model" text,
  "search_vector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector(CASE locale WHEN 'de' THEN 'german'::regconfig WHEN 'fr' THEN 'french'::regconfig WHEN 'es' THEN 'spanish'::regconfig WHEN 'sv' THEN 'swedish'::regconfig WHEN 'ar' THEN 'arabic'::regconfig WHEN 'ru' THEN 'russian'::regconfig WHEN 'pt-br' THEN 'portuguese'::regconfig WHEN 'zh-cn' THEN 'simple'::regconfig WHEN 'zh-tw' THEN 'simple'::regconfig ELSE 'english'::regconfig END, coalesce(heading_path, '')), 'A') ||
    setweight(to_tsvector(CASE locale WHEN 'de' THEN 'german'::regconfig WHEN 'fr' THEN 'french'::regconfig WHEN 'es' THEN 'spanish'::regconfig WHEN 'sv' THEN 'swedish'::regconfig WHEN 'ar' THEN 'arabic'::regconfig WHEN 'ru' THEN 'russian'::regconfig WHEN 'pt-br' THEN 'portuguese'::regconfig WHEN 'zh-cn' THEN 'simple'::regconfig WHEN 'zh-tw' THEN 'simple'::regconfig ELSE 'english'::regconfig END, coalesce(content, '')), 'B')
  ) STORED,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "kb_article_chunks_article_id_kb_articles_id_fk"
    FOREIGN KEY ("article_id") REFERENCES "kb_articles"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kb_article_chunks_article_locale_position_idx"
  ON "kb_article_chunks" ("article_id", "locale", "position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_article_chunks_locale_idx" ON "kb_article_chunks" ("locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_article_chunks_search_vector_idx"
  ON "kb_article_chunks" USING gin ("search_vector");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_article_chunks_embedding_hnsw_idx"
  ON "kb_article_chunks" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;
