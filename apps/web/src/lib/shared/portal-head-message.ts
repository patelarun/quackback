/**
 * Translated strings for a route's `head()`, which runs outside React and so
 * cannot use `useIntl`.
 *
 * The `_portal` layout loader already resolves the visitor's locale and its
 * slice of the message catalog (see `loadPortalIntl`), and every portal route's
 * `head()` receives the parent matches — so a child route reads the catalog off
 * that match rather than paying a second locale RPC of its own. Falls back to
 * the English `defaultMessage` when the portal match or the key is missing,
 * exactly as react-intl would.
 *
 * Plain lookup only: page titles and meta descriptions carry no ICU arguments.
 */
interface RouteMatchLike {
  routeId: string
  loaderData?: unknown
}

export function portalHeadMessage(
  matches: readonly RouteMatchLike[] | undefined,
  descriptor: { id: string; defaultMessage: string }
): string {
  const portalMatch = matches?.find((match) => (match.routeId as string) === '/_portal')
  const messages = (portalMatch?.loaderData as { messages?: Record<string, string> } | undefined)
    ?.messages
  return messages?.[descriptor.id] || descriptor.defaultMessage
}
