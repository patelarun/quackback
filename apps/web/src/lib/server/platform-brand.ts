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
