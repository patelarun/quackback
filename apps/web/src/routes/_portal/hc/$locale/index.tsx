import { createFileRoute } from '@tanstack/react-router'
import { FormattedMessage, useIntl } from 'react-intl'
import { HelpCenterHero } from '@/components/help-center/help-center-hero'
import { HelpCenterHeroSearch } from '@/components/help-center/help-center-search'
import { HelpCenterCategoryGrid } from '@/components/help-center/help-center-category-grid'
import { getTopLevelCategories } from '@/components/help-center/help-center-utils'
import { listPublicCategoriesFn } from '@/lib/server/functions/help-center'
import { portalHeadMessage } from '@/lib/shared/portal-head-message'
import type { HelpCenterConfig } from '@/lib/shared/types/settings'

/** Fallbacks for a locale whose admin-authored chrome strings are still empty.
 *  Resolved through react-intl so the page reads in the visitor's language
 *  rather than English. */
const DEFAULT_TITLE_MESSAGE = {
  id: 'portal.hc.home.defaultTitle',
  defaultMessage: 'How can we help?',
}
const DEFAULT_DESCRIPTION_MESSAGE = {
  id: 'portal.hc.home.defaultDescriptionBrowse',
  defaultMessage: 'Search our knowledge base or browse by category',
}

/**
 * Locale-prefixed help-center homepage (domains/languages §2). Mirrors
 * `/hc/index.tsx` for an additional locale: translated chrome strings,
 * translated+gated category grid. "Popular articles" is intentionally
 * omitted here -- view-count ranking has no per-locale notion yet, and
 * showing default-locale titles on a translated homepage would be
 * confusing. Ask AI is also off here (retrieval isn't locale-aware).
 */
export const Route = createFileRoute('/_portal/hc/$locale/')({
  loader: async ({ context, params }) => {
    const { settings } = context
    const helpCenterConfig = settings?.helpCenterConfig as HelpCenterConfig | undefined
    const categories = await listPublicCategoriesFn({ data: { locale: params.locale } })
    const chrome = helpCenterConfig?.locales?.chrome?.[params.locale]

    return {
      categories,
      title: chrome?.homepageTitle || '',
      description: chrome?.homepageDescription || '',
      searchPlaceholder: chrome?.searchPlaceholder || undefined,
      workspaceName: settings?.name ?? 'Help Center',
      logoUrl: settings?.brandingData?.logoUrl || '/logo.png',
    }
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) return {}
    const { workspaceName, logoUrl } = loaderData
    const title = loaderData.title || portalHeadMessage(matches, DEFAULT_TITLE_MESSAGE)
    const description =
      loaderData.description || portalHeadMessage(matches, DEFAULT_DESCRIPTION_MESSAGE)
    const pageTitle = `${title} - ${workspaceName}`
    return {
      meta: [
        { title: pageTitle },
        { name: 'description', content: description },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: description },
        { property: 'og:image', content: logoUrl },
      ],
    }
  },
  component: LocaleHelpCenterLandingPage,
})

function LocaleHelpCenterLandingPage() {
  const intl = useIntl()
  const { categories, title, description, searchPlaceholder } = Route.useLoaderData()
  const { locale } = Route.useParams()
  const collectionCount = getTopLevelCategories(categories).length

  return (
    <>
      <HelpCenterHero
        variant="home"
        title={title || intl.formatMessage(DEFAULT_TITLE_MESSAGE)}
        description={description || intl.formatMessage(DEFAULT_DESCRIPTION_MESSAGE)}
      >
        <HelpCenterHeroSearch locale={locale} placeholder={searchPlaceholder} />
      </HelpCenterHero>

      <section
        aria-labelledby="hc-topics"
        className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6 animate-in fade-in duration-300 fill-mode-backwards"
        style={{ animationDelay: '100ms' }}
      >
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 id="hc-topics" className="text-2xl font-semibold tracking-tight text-foreground">
            <FormattedMessage id="portal.hc.home.browseByTopic" defaultMessage="Browse by topic" />
          </h2>
          {collectionCount > 0 && (
            <span className="shrink-0 text-sm text-muted-foreground">
              <FormattedMessage
                id="portal.hc.home.collectionCount"
                defaultMessage="{count, plural, one {# collection} other {# collections}}"
                values={{ count: collectionCount }}
              />
            </span>
          )}
        </div>
        <HelpCenterCategoryGrid categories={categories} locale={locale} />
      </section>
    </>
  )
}
