import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, utils } from './shared-styles'
import { emailText } from '../messages'

interface PortalInviteEmailProps {
  workspaceName: string
  inviteLink: string
  logoUrl?: string
  personalMessage?: string
}

export function PortalInviteEmail({
  workspaceName,
  inviteLink,
  logoUrl,
  personalMessage,
}: PortalInviteEmailProps) {
  return (
    <EmailLayout
      preview={emailText('portalInvite.preview', { workspaceName })}
      logoUrl={logoUrl}
      logoAlt={workspaceName}
    >
      {/* Content */}
      <Heading style={typography.h1}>{emailText('portalInvite.heading')}</Heading>
      <Text style={typography.text}>{emailText('portalInvite.body', { workspaceName })}</Text>

      {personalMessage && (
        <Section
          style={{
            backgroundColor: '#f6f8fa',
            borderLeft: '3px solid #d0d7de',
            padding: '12px 16px',
            marginTop: '24px',
            marginBottom: '8px',
            borderRadius: '4px',
          }}
        >
          <Text style={{ ...typography.textSmall, margin: 0, fontStyle: 'italic' }}>
            {personalMessage}
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={inviteLink}>
          {emailText('portalInvite.cta')}
        </Button>
      </Section>

      {/* Fallback Link */}
      <Text style={typography.textSmall}>
        {emailText('common.copyLink')}{' '}
        <Link href={inviteLink} style={utils.link}>
          {inviteLink}
        </Link>
      </Text>

      {/* Footer */}
      <TransactionalFooter>{emailText('portalInvite.ignore')}</TransactionalFooter>
    </EmailLayout>
  )
}
