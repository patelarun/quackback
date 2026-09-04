import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components'
import { layout, branding, typography, utils, colors, DEFAULT_LOGO_URL } from './shared-styles'
import { useEmailShowPoweredBy } from '../powered-by'
import { readEmailFooterBranding } from '../footer-branding'
import { emailText } from '../messages'

interface EmailLayoutProps {
  preview: string
  logoUrl?: string
  logoAlt?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /**
   * Override the process-wide footer-branding flag. Capability-free templates
   * (no link, no code, no token) pass false so the footer cannot add an anchor.
   */
  showPoweredBy?: boolean
}

/**
 * Shared email layout with proper HTML email best practices:
 * - Wrapper Section with background color (fallback for clients that strip <body> styles)
 * - Centered container via React Email's align="center" (no margin:auto)
 * - Consistent logo, spacing, and footer placement
 */
export function EmailLayout({
  preview,
  logoUrl,
  logoAlt = 'Quackback',
  children,
  footer,
  showPoweredBy: showPoweredByOverride,
}: EmailLayoutProps) {
  const fromContext = useEmailShowPoweredBy()
  const showPoweredBy = showPoweredByOverride ?? fromContext
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={layout.main}>
        {/* Wrapper Section provides background color for clients that strip <body> styles */}
        <Section style={{ backgroundColor: colors.background }}>
          <Container style={layout.container}>
            {/* Logo */}
            <Section style={branding.logoContainer}>
              <Img
                src={logoUrl ?? DEFAULT_LOGO_URL}
                alt={logoAlt}
                width={branding.logo.width}
                height={branding.logo.height}
                style={branding.logo}
              />
            </Section>

            {children}

            {/* Footer */}
            {footer}
            {showPoweredBy ? <FooterBrandingLine /> : null}
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

/**
 * The install's own branding line, or nothing when no label is configured.
 *
 * Rendered only where the caller already allows a footer, so a capability-free
 * template still cannot grow an anchor it was written not to have.
 */
function FooterBrandingLine() {
  // Not `branding`: that name is already the shared-styles logo block above.
  const footerBranding = readEmailFooterBranding()
  if (!footerBranding) return null
  return (
    <Text style={typography.footer}>
      {footerBranding.url ? (
        <Link href={footerBranding.url} style={{ ...utils.link, fontSize: '13px' }}>
          {footerBranding.label}
        </Link>
      ) : (
        footerBranding.label
      )}
    </Text>
  )
}

/** Standard footer for transactional emails (sign-in, password reset, welcome, invitation) */
export function TransactionalFooter({ children }: { children: React.ReactNode }) {
  return <Text style={typography.footer}>{children}</Text>
}

/** Standard footer for notification emails with unsubscribe link */
export function NotificationFooter({
  reason,
  unsubscribeUrl,
  unsubscribeLabel,
  preferencesUrl,
}: {
  reason: string
  unsubscribeUrl: string
  unsubscribeLabel?: string
  preferencesUrl?: string
}) {
  const label = unsubscribeLabel ?? emailText('footer.unsubscribePost')
  return (
    <Text style={typography.footer}>
      {reason}
      <br />
      <Link href={unsubscribeUrl} style={{ ...utils.link, fontSize: '13px' }}>
        {label}
      </Link>
      {preferencesUrl ? (
        <>
          {' · '}
          <Link href={preferencesUrl} style={{ ...utils.link, fontSize: '13px' }}>
            {emailText('footer.managePreferences')}
          </Link>
        </>
      ) : null}
    </Text>
  )
}
