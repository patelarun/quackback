/**
 * The branding line at the bottom of every branded email.
 *
 * What used to be a hardcoded "Powered by Quackback" link is now two
 * environment variables, so an install names whoever is actually behind the
 * mail — and points that name at its own site — without a code change. Both
 * unset is the default and renders no line at all, which is what an install
 * that wants no attribution should get without having to opt out.
 *
 * Read fresh on every render rather than captured at module load, for the same
 * reason `getEnv` in ./index exists: a top-level read lets Vite inline the
 * value into the bundle, which would freeze it at build time.
 */

/** Who is behind this email, and where that name links. */
export interface EmailFooterBranding {
  /** The visible label, e.g. "Bokning och Schema Support". */
  label: string
  /** Absolute URL the label links to. Absent renders the label as plain text. */
  url?: string
}

/** The configured footer branding, or null when the install has set no label. */
export function readEmailFooterBranding(): EmailFooterBranding | null {
  const label = process.env['EMAIL_FOOTER_BRANDING_TEXT']?.trim()
  if (!label) return null
  const url = process.env['EMAIL_FOOTER_BRANDING_URL']?.trim()
  return url ? { label, url } : { label }
}
