import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, utils } from './shared-styles'
import { emailText, emailLocale } from '../messages'

/** The invitation's words in the team's language, written by the caller. */
export interface InvitationEmailCopy {
  lang: string
  dir: 'ltr' | 'rtl'
  preview: string
  heading: string
  body: string
  cta: string
  fallback: string
  footer: string
}

interface InvitationEmailProps {
  invitedByName: string
  inviteeName?: string
  organizationName: string
  inviteLink: string
  logoUrl?: string
  /** Localised copy. Without it the email follows EMAIL_LOCALE via the catalogue. */
  copy?: InvitationEmailCopy
}

/**
 * Fallback when the caller passes no `copy`: the install's email catalogue,
 * so the invitation still follows `EMAIL_LOCALE` (fork). Upstream fell back to
 * hard-coded English here; callers that know the team's language still pass
 * `copy` and win.
 */
function catalogueCopy({
  invitedByName,
  inviteeName,
  organizationName,
}: Pick<InvitationEmailProps, 'invitedByName' | 'inviteeName' | 'organizationName'>) {
  const body = emailText('invitation.body', { invitedByName, organizationName })
  return {
    lang: emailLocale(),
    dir: 'ltr' as const,
    preview: body,
    heading: inviteeName
      ? emailText('invitation.headingNamed', { inviteeName, organizationName })
      : emailText('invitation.heading', { organizationName }),
    body,
    cta: emailText('invitation.cta'),
    fallback: emailText('invitation.fallback'),
    footer: emailText('invitation.ignore'),
  }
}

export function InvitationEmail(props: InvitationEmailProps) {
  const { organizationName, inviteLink, logoUrl } = props
  const copy = props.copy ?? catalogueCopy(props)
  return (
    <EmailLayout
      preview={copy.preview}
      logoUrl={logoUrl}
      logoAlt={organizationName}
      lang={copy.lang}
      dir={copy.dir}
    >
      <Heading style={typography.h1}>{copy.heading}</Heading>
      <Text style={typography.text}>{copy.body}</Text>

      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={inviteLink}>
          {copy.cta}
        </Button>
      </Section>

      <Text style={typography.textSmall}>
        {copy.fallback}{' '}
        <Link href={inviteLink} style={{ ...utils.link, direction: 'ltr', unicodeBidi: 'isolate' }}>
          {inviteLink}
        </Link>
      </Text>

      <TransactionalFooter>{copy.footer}</TransactionalFooter>
    </EmailLayout>
  )
}
