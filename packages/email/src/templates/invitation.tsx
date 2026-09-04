import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, utils } from './shared-styles'
import { emailText } from '../messages'

interface InvitationEmailProps {
  invitedByName: string
  inviteeName?: string
  organizationName: string
  inviteLink: string
  logoUrl?: string
}

export function InvitationEmail({
  invitedByName,
  inviteeName,
  organizationName,
  inviteLink,
  logoUrl,
}: InvitationEmailProps) {
  return (
    <EmailLayout
      preview={emailText('invitation.preview', { organizationName })}
      logoUrl={logoUrl}
      logoAlt={organizationName}
    >
      {/* Content */}
      <Heading style={typography.h1}>
        {inviteeName
          ? emailText('invitation.headingNamed', { inviteeName })
          : emailText('invitation.heading')}
      </Heading>
      <Text style={typography.text}>
        {emailText('invitation.body', { invitedByName, organizationName })}
      </Text>

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={inviteLink}>
          {emailText('invitation.cta')}
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
      <TransactionalFooter>{emailText('invitation.ignore')}</TransactionalFooter>
    </EmailLayout>
  )
}
