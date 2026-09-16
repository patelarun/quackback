/**
 * Resolve the `{locale}` path parameter of the REST translation routes
 * (domains/languages §2).
 *
 * Shared by the article and category translation routes because the rule is
 * the same for both and the reasoning is the point: either rejection, left to
 * the database, would succeed and then do nothing a reader could ever see.
 */
import { getHelpCenterConfig } from '@/lib/server/domains/settings/settings.service'
import { ValidationError } from '@/lib/shared/errors'

/**
 * Narrow a requested locale to the one the help center actually serves.
 *
 * The base content locale is rejected because its copy lives on `kb_articles` /
 * `kb_categories` themselves -- a translation row in that locale is written and
 * never read. A locale absent from `locales.additional` is rejected because it
 * has no `/hc/{locale}` URL to appear under.
 *
 * The returned spelling comes from the configuration rather than the request,
 * so `SV` cannot create a row that `sv` readers never find.
 *
 * @throws {ValidationError} naming the locales that would have worked
 */
export async function resolveWritableHelpCenterLocale(requestedLocale: string): Promise<string> {
  const { locales } = await getHelpCenterConfig()
  const normalizedLocale = requestedLocale.trim().toLowerCase()

  if (normalizedLocale === locales.default.toLowerCase()) {
    throw new ValidationError(
      'VALIDATION_ERROR',
      `"${requestedLocale}" is the help center's base content locale. ` +
        'Edit the article or category itself rather than a translation of it.'
    )
  }

  const enabledLocale = locales.additional.find(
    (locale) => locale.toLowerCase() === normalizedLocale
  )

  if (!enabledLocale) {
    throw new ValidationError(
      'VALIDATION_ERROR',
      locales.additional.length > 0
        ? `"${requestedLocale}" is not an enabled help center locale. ` +
            `Enabled: ${locales.additional.join(', ')}.`
        : `"${requestedLocale}" is not an enabled help center locale. ` +
            'No additional locales are enabled.'
    )
  }

  return enabledLocale
}
