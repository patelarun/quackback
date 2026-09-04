import { EMPTY_PLATFORM_BRAND, type PlatformBrand } from '@/lib/shared/platform-brand'

/**
 * Reads the platform brand straight from the environment.
 *
 * Deliberately NOT routed through `lib/server/config`. That module validates
 * the WHOLE environment on first read and throws when anything required is
 * missing, which is correct for a boot-time setting and wrong here: the brand
 * is read on the API error path (`unauthorizedResponse`), and an error response
 * that throws because `SECRET_KEY` is unset in a unit test — or on a
 * half-configured install — turns a 401 into a 500.
 *
 * Read per call rather than cached at module load, for the reason `getEnv` in
 * `packages/email` exists: a top-level read lets the bundler inline the value.
 */
export function readPlatformBrandFromEnv(): PlatformBrand {
  const read = (key: string) => process.env[key]?.trim() ?? ''
  const name = read('PLATFORM_BRAND_NAME')
  if (!name) {
    // No name means no mark anywhere, so the rest cannot matter.
    return { ...EMPTY_PLATFORM_BRAND, description: read('PLATFORM_BRAND_DESCRIPTION') }
  }
  return {
    name,
    logoUrl: read('PLATFORM_BRAND_LOGO_URL'),
    url: read('PLATFORM_BRAND_URL'),
    description: read('PLATFORM_BRAND_DESCRIPTION'),
  }
}

/**
 * A name for this install that is never empty and never the upstream vendor's.
 *
 * For the places where *something* has to be shown and a blank is not an
 * option — an authenticator app's issuer, an OAuth consent screen's client
 * name. Falls back to the install's own hostname, which is both meaningful to
 * the reader and impossible to confuse with someone else's product.
 */
export function platformDisplayName(baseUrl: string): string {
  const configured = readPlatformBrandFromEnv().name
  if (configured) return configured
  try {
    return new URL(baseUrl).host
  } catch {
    return 'Support'
  }
}

/**
 * The issuer shown in a teammate's authenticator app.
 *
 * Its own variable rather than the platform brand, because it answers a
 * different question. The brand names the product; this has to distinguish
 * THIS app from every other entry in the same authenticator — including a
 * sibling app on the same brand. An operator running both a main product and
 * this support portal under one name would otherwise get two entries reading
 * identically, with no way to tell which code belongs to which.
 *
 * Falls back to the platform display name, so an install that only has one app
 * need not set it.
 */
export function platformTotpIssuer(baseUrl: string): string {
  return process.env['PLATFORM_TOTP_ISSUER']?.trim() || platformDisplayName(baseUrl)
}
