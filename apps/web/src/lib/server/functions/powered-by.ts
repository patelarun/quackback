import { createServerFn } from '@tanstack/react-start'

/**
 * Public: whether the Powered-by badge should render.
 *
 * Fork: always false. Upstream shows the badge on every self-hosted install
 * ("Self-hosted is always true"); this install is white-labelled for Bokning
 * och Schema, so the vendor credit is never shown — in the portal, the
 * feedback sidebar or the widget. This is the single switch for all three;
 * the components keep upstream's badge code so merges stay small.
 */
export const getShowPoweredByFn = createServerFn({ method: 'GET' }).handler(async () => false)
