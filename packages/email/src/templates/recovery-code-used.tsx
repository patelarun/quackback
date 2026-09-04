import { Heading, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography } from './shared-styles'
import { emailText } from '../messages'

interface RecoveryCodeUsedEmailProps {
  workspaceName?: string
  ipAddress?: string | null
  userAgent?: string | null
  occurredAt: string
  logoUrl?: string
}

/**
 * Security alert sent after a recovery code is consumed. Mirrors the
 * "new sign-in from unrecognised device" pattern most platforms send
 * — the recipient is the one whose code was used, so the email is
 * their canary against unauthorised access.
 */
export function RecoveryCodeUsedEmail({
  workspaceName,
  ipAddress,
  userAgent,
  occurredAt,
  logoUrl,
}: RecoveryCodeUsedEmailProps) {
  return (
    <EmailLayout
      preview={
        workspaceName
          ? emailText('recoveryCodeUsed.previewFor', { workspaceName })
          : emailText('recoveryCodeUsed.preview')
      }
      logoUrl={logoUrl}
    >
      <Heading style={{ ...typography.h1, textAlign: 'center' }}>
        {emailText('recoveryCodeUsed.heading')}
      </Heading>
      <Text style={{ ...typography.text, textAlign: 'center' }}>
        {workspaceName
          ? emailText('recoveryCodeUsed.bodyFor', { workspaceName })
          : emailText('recoveryCodeUsed.body')}
      </Text>

      <Section style={{ marginTop: '24px', marginBottom: '24px' }}>
        <Text style={typography.textSmall}>
          <strong>{emailText('common.label.when')}</strong> {occurredAt}
        </Text>
        {ipAddress ? (
          <Text style={typography.textSmall}>
            <strong>{emailText('recoveryCodeUsed.label.ip')}</strong> {ipAddress}
          </Text>
        ) : null}
        {userAgent ? (
          <Text style={typography.textSmall}>
            <strong>{emailText('common.label.device')}</strong> {userAgent}
          </Text>
        ) : null}
      </Section>

      <Text style={typography.text}>{emailText('recoveryCodeUsed.adviceYou')}</Text>
      <Text style={typography.text}>{emailText('recoveryCodeUsed.adviceNotYou')}</Text>

      <TransactionalFooter>{emailText('recoveryCodeUsed.footer')}</TransactionalFooter>
    </EmailLayout>
  )
}
