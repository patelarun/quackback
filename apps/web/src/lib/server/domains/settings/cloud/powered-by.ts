import type { CloudConfig } from './cloud.types'

/**
 * Whether the footer branding line should render on branded emails.
 *
 * The portal and the widget carry no such line any more, so emails are the one
 * surface this still gates; what the line says is the install's own
 * `EMAIL_FOOTER_BRANDING_TEXT`, not a fixed vendor name.
 *
 * Self-hosted (cloud disabled) always shows it. `isEntitled('hideBranding')` is
 * the wrong check: that function is true when cloud is off, which would hide
 * the badge on every OSS install.
 */
export function shouldShowPoweredBy(config: CloudConfig): boolean {
  if (!config.enabled) return true
  return config.entitlements.hideBranding !== true
}
