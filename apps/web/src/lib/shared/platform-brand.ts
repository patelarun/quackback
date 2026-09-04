/**
 * The platform's own name and mark — the vendor identity, not a workspace's.
 *
 * Upstream hardcoded "Quackback" and `/logo.png` into the sign-in pages, the
 * document title, the public API reference and the outbound webhook
 * User-Agent. None of those are workspace branding (a workspace already has its
 * own name and logo in settings); they are the product speaking as itself, and
 * on a fork they name the wrong product.
 *
 * So they come from the environment instead. An install that sets nothing gets
 * no platform mark at all rather than someone else's — the same default the
 * email footer branding takes, and the reason `name` being blank is a supported
 * state here rather than a misconfiguration.
 *
 * Shared, not server-only: the sign-in pages render on the client, so the
 * resolved values ride the bootstrap payload the way `baseUrl` does.
 */
export interface PlatformBrand {
  /** Product name. Empty = render no platform mark and fall back to the workspace's own name. */
  name: string
  /** Image for the mark. Only rendered alongside a non-empty `name`. */
  logoUrl: string
  /** Absolute URL the mark links to. Empty = render the mark unlinked. */
  url: string
  /** Meta description for the root document. Empty = emit no description. */
  description: string
}

export const EMPTY_PLATFORM_BRAND: PlatformBrand = {
  name: '',
  logoUrl: '',
  url: '',
  description: '',
}

/** True when there is a platform mark worth rendering. */
export function hasPlatformMark(brand: PlatformBrand | null | undefined): boolean {
  return !!brand && brand.name.trim().length > 0
}

/**
 * The User-Agent outbound webhooks identify themselves with.
 *
 * A receiver that filters on it needs a stable, non-empty token, so the
 * unbranded default is a plain one rather than nothing at all.
 */
export function webhookUserAgent(brand: PlatformBrand | null | undefined): string {
  const name = brand?.name.trim()
  if (!name) return 'Webhook/1.0'
  const url = brand?.url.trim()
  return url ? `${name} Webhook/1.0 (+${url})` : `${name} Webhook/1.0`
}
