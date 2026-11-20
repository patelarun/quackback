import { Heading, Hr, Link, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, utils } from './shared-styles'
import { emailText } from '../messages'

interface NewSignInEmailProps {
  workspaceName?: string
  occurredAt: string
  ipAddress?: string | null
  userAgent?: string | null
  location?: string | null
  settingsUrl?: string | null
  /** When true, skip the password CTA — the profile page hides PasswordForm. */
  ssoEnforced?: boolean
  logoUrl?: string
}

/**
 * "New device" sign-in notification — sent when an additional signed
 * device cookie is seen for the recipient's account. Browser/OS, IP
 * and location are shown as context; they are not the device identity.
 * The user is already signed in by the time this lands; the alert is
 * purely informational with a recovery path if it wasn't them.
 */
export function NewSignInEmail({
  workspaceName,
  occurredAt,
  ipAddress,
  userAgent,
  location,
  settingsUrl,
  ssoEnforced,
  logoUrl,
}: NewSignInEmailProps) {
  return (
    <EmailLayout preview={emailText('newSignIn.preview')} logoUrl={logoUrl}>
      <Heading style={typography.h1}>{emailText('newSignIn.heading')}</Heading>
      <Text style={typography.text}>
        {workspaceName
          ? emailText('newSignIn.bodyFor', { workspaceName })
          : emailText('newSignIn.body')}
      </Text>

      <Section style={utils.codeBox}>
        <Text style={typography.text}>
          <strong>{emailText('common.label.when')}</strong> {occurredAt}
        </Text>
        {ipAddress ? (
          <Text style={typography.text}>
            <strong>{emailText('newSignIn.label.ip')}</strong> {ipAddress}
          </Text>
        ) : null}
        {location ? (
          <Text style={typography.text}>
            <strong>{emailText('newSignIn.label.location')}</strong> {location}
          </Text>
        ) : null}
        {userAgent ? (
          <Text style={typography.text}>
            <strong>{emailText('common.label.device')}</strong> {userAgent}
          </Text>
        ) : null}
      </Section>

      <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

      <Text style={typography.text}>
        {ssoEnforced ? (
          emailText('newSignIn.adviceSso')
        ) : settingsUrl ? (
          <>
            {emailText('newSignIn.adviceLinkLead')}{' '}
            <Link href={settingsUrl} style={utils.link}>
              {emailText('newSignIn.adviceLinkText')}
            </Link>{' '}
            {emailText('newSignIn.adviceLinkTail')}
          </>
        ) : (
          emailText('newSignIn.advice')
        )}
      </Text>

      <TransactionalFooter>{emailText('newSignIn.footer')}</TransactionalFooter>
    </EmailLayout>
  )
}
