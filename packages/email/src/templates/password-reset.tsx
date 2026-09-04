import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, utils } from './shared-styles'
import { emailText } from '../messages'

interface PasswordResetEmailProps {
  resetLink: string
  logoUrl?: string
}

export function PasswordResetEmail({ resetLink, logoUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview={emailText('passwordReset.preview')} logoUrl={logoUrl}>
      {/* Content */}
      <Heading style={{ ...typography.h1, textAlign: 'center' }}>
        {emailText('passwordReset.heading')}
      </Heading>
      <Text style={{ ...typography.text, textAlign: 'center' }}>
        {emailText('passwordReset.body')}
      </Text>

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={resetLink}>
          {emailText('passwordReset.cta')}
        </Button>
      </Section>

      {/* Fallback Link */}
      <Text style={typography.textSmall}>
        {emailText('common.copyLink')}{' '}
        <Link href={resetLink} style={utils.link}>
          {resetLink}
        </Link>
      </Text>

      {/* Footer */}
      <TransactionalFooter>{emailText('passwordReset.ignore')}</TransactionalFooter>
    </EmailLayout>
  )
}
