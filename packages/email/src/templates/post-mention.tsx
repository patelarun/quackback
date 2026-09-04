import { Button, Column, Heading, Row, Section, Text } from '@react-email/components'
import { EmailLayout, NotificationFooter } from './email-layout'
import { typography, button, colors } from './shared-styles'
import { emailText } from '../messages'

export interface PostMentionEmailProps {
  mentionerName: string
  postTitle: string
  /** Paragraph context for the mention. Empty string suppresses the quote block. */
  excerpt: string
  postUrl: string
  workspaceName: string
  unsubscribeUrl?: string
  preferencesUrl?: string
  logoUrl?: string
}

export function PostMentionEmail({
  mentionerName,
  postTitle,
  excerpt,
  postUrl,
  workspaceName,
  unsubscribeUrl,
  preferencesUrl,
  logoUrl,
}: PostMentionEmailProps) {
  const displayName = mentionerName || 'Anonymous user'
  const hasExcerpt = excerpt.length > 0

  return (
    <EmailLayout
      preview={emailText('postMention.preview', { displayName, postTitle })}
      logoUrl={logoUrl}
      logoAlt={workspaceName}
    >
      {/* Content */}
      <Heading style={typography.h1}>{emailText('postMention.heading')}</Heading>
      <Text style={typography.text}>
        {emailText('postMention.body', { displayName, postTitle })}
      </Text>

      {/* Post Title */}
      <Section
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '16px',
        }}
      >
        <Text
          style={{
            ...typography.textSmall,
            marginTop: '0',
            marginBottom: '4px',
            color: colors.textMuted,
          }}
        >
          {emailText('common.label.feedback')}
        </Text>
        <Text style={{ ...typography.text, marginTop: '0', marginBottom: '0', fontWeight: '600' }}>
          {postTitle}
        </Text>
      </Section>

      {/* Excerpt — using Row/Column instead of border-left for Outlook compatibility */}
      {hasExcerpt ? (
        <Row style={{ marginBottom: '24px' }}>
          <Column style={{ width: '3px', backgroundColor: colors.primary, borderRadius: '2px' }} />
          <Column style={{ paddingLeft: '16px' }}>
            <Text
              style={{
                ...typography.text,
                marginTop: '0',
                marginBottom: '0',
                fontStyle: 'italic',
              }}
            >
              &quot;{excerpt}&quot;
            </Text>
          </Column>
        </Row>
      ) : null}

      {/* CTA Button */}
      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={postUrl}>
          {emailText('postMention.cta')}
        </Button>
      </Section>

      {/* Footer */}
      {unsubscribeUrl ? (
        <NotificationFooter
          reason={emailText('mention.reason', { workspaceName })}
          unsubscribeUrl={unsubscribeUrl}
          preferencesUrl={preferencesUrl}
        />
      ) : (
        <Text style={typography.footer}>{emailText('mention.reason', { workspaceName })}</Text>
      )}
    </EmailLayout>
  )
}
