import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailLayout, NotificationFooter } from './email-layout'
import { typography, button, colors } from './shared-styles'
import { emailText } from '../messages'

interface FeedbackLinkedEmailProps {
  recipientName?: string
  postTitle: string
  postUrl: string
  workspaceName: string
  unsubscribeUrl: string
  preferencesUrl?: string
  attributedByName?: string
  logoUrl?: string
}

export function FeedbackLinkedEmail({
  recipientName,
  postTitle,
  postUrl,
  workspaceName,
  unsubscribeUrl,
  preferencesUrl,
  attributedByName,
  logoUrl,
}: FeedbackLinkedEmailProps) {
  const greeting = recipientName
    ? emailText('feedbackLinked.greetingNamed', { recipientName })
    : emailText('feedbackLinked.greeting')
  const attribution = attributedByName
    ? emailText('feedbackLinked.attributedBy', { attributedByName, workspaceName })
    : emailText('feedbackLinked.attributed', { workspaceName })

  return (
    <EmailLayout
      preview={emailText('feedbackLinked.preview', { postTitle })}
      logoUrl={logoUrl}
      logoAlt={workspaceName}
    >
      {/* Content */}
      <Heading style={typography.h1}>{emailText('feedbackLinked.heading')}</Heading>
      <Text style={typography.text}>
        {greeting} {attribution} {emailText('feedbackLinked.followUp')}
      </Text>

      {/* Post Title */}
      <Section
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ ...typography.text, marginTop: '0', marginBottom: '0', fontWeight: '600' }}>
          {postTitle}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={postUrl}>
          {emailText('feedbackLinked.cta')}
        </Button>
      </Section>

      {/* Footer */}
      <NotificationFooter
        reason={emailText('feedbackLinked.reason')}
        unsubscribeUrl={unsubscribeUrl}
        preferencesUrl={preferencesUrl}
      />
    </EmailLayout>
  )
}
