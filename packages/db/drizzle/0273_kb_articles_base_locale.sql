-- @contract: safe-after 0.13.2   (the dropped column is GENERATED ALWAYS from
-- title/content and is re-added below in the same migration, so nothing that
-- survives this file ever observes it missing and no authored data is lost)
-- Base articles carry the locale they are AUTHORED in, so keyword search can
-- stem them with the right Postgres text-search config. Until now the base
-- table hardcoded 'english' in its generated tsvector, which silently applied
-- English stemming and stopwords to a help center authored in any other
-- language. Translation rows have always been locale-aware (kb_article_
-- translations.search_vector); this brings the base table in line.
--
-- Defaults to 'en' so existing installs keep their current behaviour; the
-- workspace's configured base locale (helpCenterConfig.locales.default) is what
-- backfills it, either here for a fresh install or by the base-locale swap
-- script for a workspace changing its authoring language.
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "locale" text NOT NULL DEFAULT 'en';
--> statement-breakpoint

-- A generated column's expression cannot be altered in place, so the column is
-- dropped and re-added. The GIN index goes with it and is recreated below.
DROP INDEX IF EXISTS "kb_articles_search_vector_idx";
--> statement-breakpoint
ALTER TABLE "kb_articles" DROP COLUMN IF EXISTS "search_vector";
--> statement-breakpoint
ALTER TABLE "kb_articles" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector(CASE locale WHEN 'de' THEN 'german'::regconfig WHEN 'fr' THEN 'french'::regconfig WHEN 'es' THEN 'spanish'::regconfig WHEN 'sv' THEN 'swedish'::regconfig WHEN 'ar' THEN 'arabic'::regconfig WHEN 'ru' THEN 'russian'::regconfig WHEN 'pt-br' THEN 'portuguese'::regconfig WHEN 'zh-cn' THEN 'simple'::regconfig WHEN 'zh-tw' THEN 'simple'::regconfig ELSE 'english'::regconfig END, coalesce(title, '')), 'A') ||
    setweight(to_tsvector(CASE locale WHEN 'de' THEN 'german'::regconfig WHEN 'fr' THEN 'french'::regconfig WHEN 'es' THEN 'spanish'::regconfig WHEN 'sv' THEN 'swedish'::regconfig WHEN 'ar' THEN 'arabic'::regconfig WHEN 'ru' THEN 'russian'::regconfig WHEN 'pt-br' THEN 'portuguese'::regconfig WHEN 'zh-cn' THEN 'simple'::regconfig WHEN 'zh-tw' THEN 'simple'::regconfig ELSE 'english'::regconfig END, coalesce(content, '')), 'B')
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kb_articles_search_vector_idx" ON "kb_articles" USING gin ("search_vector");
