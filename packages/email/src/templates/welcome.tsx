import { Button, Column, Heading, Row, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, colors } from './shared-styles'
import { emailText } from '../messages'

interface WelcomeEmailProps {
  name: string
  workspaceName: string
  dashboardUrl: string
  logoUrl?: string
}

export function WelcomeEmail({ name, workspaceName, dashboardUrl, logoUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={emailText('welcome.preview', { workspaceName })}
      logoUrl={logoUrl}
      logoAlt={workspaceName}
    >
      {/* Content */}
      <Heading style={typography.h1}>{emailText('welcome.heading')}</Heading>
      <Text style={typography.text}>{emailText('welcome.body', { name, workspaceName })}</Text>

      {/* Features List - using Row/Column instead of spans for email compatibility */}
      <Section style={{ marginBottom: '24px' }}>
        {[
          emailText('welcome.feature.boards'),
          emailText('welcome.feature.team'),
          emailText('welcome.feature.roadmap'),
          emailText('welcome.feature.integrations'),
        ].map((feature) => (
          <Row key={feature} style={{ marginBottom: '4px' }}>
            <Column style={{ width: '28px', verticalAlign: 'top' }}>
              <Text style={checkIcon}>&#10003;</Text>
            </Column>
            <Column>
              <Text style={featureText}>{feature}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Button style={button.primary} href={dashboardUrl}>
          {emailText('welcome.cta')}
        </Button>
      </Section>

      {/* Footer */}
      <TransactionalFooter>
        {emailText('welcome.signOff')}
        <br />
        {emailText('welcome.signature')}
      </TransactionalFooter>
    </EmailLayout>
  )
}

const checkIcon = {
  color: colors.primary,
  fontSize: '15px',
  fontWeight: '700' as const,
  lineHeight: '28px',
  marginTop: '0',
  marginBottom: '0',
}

const featureText = {
  color: colors.text,
  fontSize: '15px',
  lineHeight: '28px',
  marginTop: '0',
  marginBottom: '0',
}
