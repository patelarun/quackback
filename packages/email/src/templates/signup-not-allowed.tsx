import { Heading, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography } from './shared-styles'
import { emailText } from '../messages'

interface SignupNotAllowedEmailProps {
  workspaceName?: string
  logoUrl?: string
}

/**
 * Why no sign-in link arrived.
 *
 * The workspace refuses to open an account for this address, and the HTTP
 * response deliberately does not say so: an endpoint that answered differently
 * per address would tell any unauthenticated caller which addresses hold
 * accounts here. The inbox is the one channel that reaches only the person the
 * answer is about, so the refusal is delivered here instead.
 *
 * Carries no link and no code. There is nothing to grant, which is the point:
 * a message with no capability in it can be mailed to an address nobody has
 * proven they own.
 */
export function SignupNotAllowedEmail({ workspaceName, logoUrl }: SignupNotAllowedEmailProps) {
  const where = workspaceName ?? emailText('signupNotAllowed.fallbackWorkspace')
  return (
    <EmailLayout
      preview={emailText('signupNotAllowed.preview')}
      logoUrl={logoUrl}
      showPoweredBy={false}
    >
      <Heading style={{ ...typography.h1, textAlign: 'center' }}>
        {emailText('signupNotAllowed.heading')}
      </Heading>
      <Text style={{ ...typography.text, textAlign: 'center' }}>
        {emailText('signupNotAllowed.body', { where })}
      </Text>
      <Text style={{ ...typography.text, textAlign: 'center' }}>
        {emailText('signupNotAllowed.explanation', { where })}
      </Text>

      <TransactionalFooter>{emailText('signupNotAllowed.footer')}</TransactionalFooter>
    </EmailLayout>
  )
}
