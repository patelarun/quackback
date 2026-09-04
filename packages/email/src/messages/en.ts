/**
 * English email copy — the fallback language, and the source of truth for the
 * key set: every other catalogue is typed against this object's keys.
 *
 * The wording here is the wording that was inline in the senders and templates
 * before the extraction, character for character. Keeping it identical is what
 * lets the package's existing assertions keep passing unchanged, so a diff in
 * this file is a copy change and nothing else.
 *
 * `{placeholder}` names are substituted at lookup time. A name that the caller
 * does not supply is left visible rather than blanked, so a missed parameter
 * shows up in a test or a dev preview instead of shipping a gap.
 */
export const en = {
  // --- Conversation mail (visitor ↔ team) ---------------------------------
  'conversation.teamAlert.subjectFallback': 'New message',
  'conversation.teamAlert.heading': 'New message',
  'conversation.teamAlert.introFirst': '{senderName} started a conversation in {workspaceName}.',
  'conversation.teamAlert.introFollowUp': '{senderName} sent a new message in {workspaceName}.',
  'conversation.teamAlert.cta': 'Open inbox',
  'conversation.teamAlert.reason':
    'You received this email because you are a member of this workspace.',
  'conversation.subject.newReply': 'New reply from {workspaceName}',
  'conversation.subject.newMessage': 'New message from {workspaceName}',
  'conversation.intro.agentReply':
    '{senderName} replied to your conversation with {workspaceName}.',
  'conversation.intro.agentStarted': '{senderName} from {workspaceName} sent you a message.',
  'conversation.cta.viewConversation': 'View conversation',
  'conversation.reason.openConversation':
    'You received this email because you have an open conversation with this team.',
  'conversation.reason.workspaceSentMessage':
    'You received this email because {workspaceName} sent you a message.',

  // --- Account and sign-in ------------------------------------------------
  'invitation.subject': "You've been invited to join {workspaceName} on Quackback",
  'portalInvite.subject': "You've been invited to {workspaceName}",
  'welcome.subject': 'Welcome to {workspaceName} on Quackback!',
  'magicLink.subject': 'Your Quackback sign-in link',
  'signupNotAllowed.subject': 'About your Quackback sign-in request',
  'passwordReset.subject': 'Reset your Quackback password',
  'recoveryCodeUsed.subject': 'A recovery code on your account was just used',
  'newSignIn.subject': 'New sign-in to your account',
  'verifyAddress.subject': 'Confirm your email address',

  // --- Feedback, posts, changelog, status ---------------------------------
  'statusChange.subject': 'Your feedback is now {status}!',
  'newComment.subject': 'New comment on "{postTitle}"',
  'postMention.subject': '{displayName} mentioned you in "{postTitle}"',
  'postMention.fallbackName': 'Anonymous user',
  'noteMention.subject': '{displayName} mentioned you in an internal note',
  'noteMention.fallbackName': 'A teammate',
  'changelog.subject': 'New update: {changelogTitle}',
  'feedbackLinked.subject': 'Your feedback has been linked to "{postTitle}"',
  'statusIncident.subject': 'Incident: {incidentTitle}',
  'statusMaintenance.subject': 'Scheduled maintenance: {maintenanceTitle}',
  'csat.subject': 'How did we do?',

  // --- Ticket events ------------------------------------------------------
  'ticket.requesterReason':
    "You're receiving this because you opened ticket {ticketLabel} at {workspaceName}.",
  'ticket.cta.viewTicket': 'View your ticket',
  'ticket.cta.openInbox': 'Open in inbox',
  'ticket.created.subject': 'We received your ticket {ticketLabel}: {title}',
  'ticket.created.heading': "We've got your ticket",
  'ticket.created.intro':
    'Your ticket {ticketLabel} "{title}" is with the {workspaceName} team. We\'ll email you as soon as there\'s a reply.',
  'ticket.reply.subject': 'New reply on {ticketLabel}: {title}',
  'ticket.reply.heading': 'New reply on your ticket',
  'ticket.reply.intro': '{authorName} replied to {ticketLabel} "{title}":',
  'ticket.reply.fallbackAuthor': 'The team',
  'ticket.closed.subject': 'Your ticket {ticketLabel} was closed',
  'ticket.closed.heading': 'Your ticket was closed',
  'ticket.closed.intro': '{ticketLabel} "{title}" has been closed by the {workspaceName} team.',
  'ticket.closed.note':
    'If you have a follow-up, reply on the ticket thread — replying reopens it.',
  'ticket.resolved.subject': 'Your ticket {ticketLabel} was resolved',
  'ticket.resolved.heading': 'Your ticket was resolved',
  'ticket.resolved.intro':
    '{ticketLabel} "{title}" has been marked resolved by the {workspaceName} team.',
  'ticket.resolved.note':
    "Reply on the ticket thread if this isn't fixed for you; replying reopens it.",
  'ticket.assigned.subject': 'Ticket {ticketLabel} assigned to you',
  'ticket.assigned.heading': 'You were assigned a ticket',
  'ticket.assigned.intro': '{ticketLabel} "{title}" was assigned to you.',
  'ticket.assigned.reason': "You're receiving this because the ticket was assigned to you.",
  'ticket.assignedTeam.subject': 'Ticket {ticketLabel} assigned to your team',
  'ticket.assignedTeam.heading': 'A ticket was assigned to your team',
  'ticket.assignedTeam.intro': '{ticketLabel} "{title}" was assigned to your team.',
  'ticket.assignedTeam.reason':
    "You're receiving this because the ticket was assigned to your team.",
  'ticket.sla.defaultClock': 'response',
  'ticket.sla.defaultDue': 'soon',
  'ticket.sla.defaultDuePast': 'earlier',
  'ticket.sla.reason': "You're receiving this because you're responsible for this conversation.",
  'ticket.slaWarning.subject': 'SLA at risk: {clockLabel} due {dueLabel}',
  'ticket.slaWarning.heading': '{clockLabel} SLA approaching breach',
  'ticket.slaWarning.intro': 'The conversation with {title} needs a {clockLabel} soon.',
  'ticket.slaWarning.factLine': '{clockLabel} due {dueLabel}',
  'ticket.slaBreach.subject': 'SLA breached: {clockLabel} for {title}',
  'ticket.slaBreach.heading': '{clockLabel} SLA breached',
  'ticket.slaBreach.intro': 'The conversation with {title} has passed its {clockLabel} target.',
  'ticket.slaBreach.factLine': '{clockLabel} was due {dueLabel}',

  // --- Shared template fragments ------------------------------------------
  'common.copyLink': 'Or copy and paste this link into your browser:',

  // --- Sign-in mail -------------------------------------------------------
  'magicLink.preview': 'Your sign-in link',
  'magicLink.heading': 'Sign in to Quackback',
  'magicLink.body': 'Click the button below to finish signing in.',
  'magicLink.cta': 'Sign in',
  'magicLink.codeIntro': 'Or enter this code on the sign-in screen:',
  'magicLink.expiry': 'The link and code expire in 10 minutes.',
  'magicLink.ignore': "If you didn't request this, you can safely ignore this email.",

  // --- Password reset -----------------------------------------------------
  'passwordReset.preview': 'Reset your Quackback password',
  'passwordReset.heading': 'Reset your password',
  'passwordReset.body':
    'Click the button below to set a new password. This link expires in 24 hours.',
  'passwordReset.cta': 'Reset Password',
  'passwordReset.ignore':
    "If you didn't request a password reset, you can safely ignore this email.",

  // --- Address verification -----------------------------------------------
  'verifyAddress.preview': 'Your verification code',
  'verifyAddress.previewFor': 'Your verification code for {workspaceName}',
  'verifyAddress.heading': 'Confirm your email',
  'verifyAddress.body': 'Enter this code to confirm this address. It expires in 10 minutes.',
  'verifyAddress.bodyFor':
    'Enter this code for {workspaceName} to confirm this address. It expires in 10 minutes.',
  'verifyAddress.ignore':
    "If you didn't ask for this, ignore it — nothing changes without the code.",
  'verifyAddress.footer':
    "You're receiving this because someone entered this address on an account. It won't be used for anything until it's confirmed.",

  // --- Welcome ------------------------------------------------------------
  'welcome.preview': 'Welcome to {workspaceName} on Quackback',
  'welcome.heading': 'Welcome to Quackback!',
  'welcome.body':
    'Hi {name}, your workspace {workspaceName} is ready. Start collecting and managing customer feedback today.',
  'welcome.feature.boards': 'Create feedback boards',
  'welcome.feature.team': 'Invite your team',
  'welcome.feature.roadmap': 'Share your public roadmap',
  'welcome.feature.integrations': 'Connect GitHub, Slack & Discord',
  'welcome.cta': 'Go to Dashboard',
  'welcome.signOff': 'Happy collecting!',
  'welcome.signature': 'The Quackback Team',

  // --- Teammate invitation ------------------------------------------------
  'invitation.preview': 'Join {organizationName} on Quackback',
  'invitation.heading': "You're invited!",
  'invitation.headingNamed': "Hi {inviteeName}, you're invited!",
  'invitation.body': '{invitedByName} has invited you to join {organizationName} on Quackback.',
  'invitation.cta': 'Accept Invitation',
  'invitation.ignore': "If you weren't expecting this invitation, you can ignore this email.",

  // --- Portal invitation --------------------------------------------------
  'portalInvite.preview': "You've been invited to access the {workspaceName} portal",
  'portalInvite.heading': "You've been invited!",
  'portalInvite.body':
    "You've been invited to access the {workspaceName} portal. Click below to accept and sign in.",
  'portalInvite.cta': 'Accept invitation',
  'portalInvite.ignore': "If you weren't expecting this invitation, you can ignore this email.",

  // --- Security alerts ----------------------------------------------------
  'common.label.when': 'When:',
  'common.label.device': 'Device:',
  'newSignIn.preview': 'A new sign-in was detected on your account',
  'newSignIn.heading': 'New sign-in to your account',
  'newSignIn.body': 'Someone just signed in to your account on a device we haven’t seen before.',
  'newSignIn.bodyFor':
    "Someone just signed in to your {workspaceName} account on a device we haven't seen before.",
  'newSignIn.label.ip': 'IP:',
  'newSignIn.advice':
    'If that was you, no action needed. If it wasn’t, change your password and revoke any other active sessions.',
  'newSignIn.footer':
    "You're receiving this because a new sign-in was detected on your account. These alerts are required and can't be disabled.",
  'recoveryCodeUsed.preview': 'A recovery code was used to sign in',
  'recoveryCodeUsed.previewFor': 'A recovery code was used to sign in for {workspaceName}',
  'recoveryCodeUsed.heading': 'A recovery code was used',
  'recoveryCodeUsed.body':
    'Someone signed in to your account using one of your saved recovery codes.',
  'recoveryCodeUsed.bodyFor':
    'Someone signed in to your account for {workspaceName} using one of your saved recovery codes.',
  'recoveryCodeUsed.label.ip': 'IP address:',
  'recoveryCodeUsed.adviceYou':
    "If this was you, no action is needed. The code is now spent and can't be reused.",
  'recoveryCodeUsed.adviceNotYou':
    "If this wasn't you, sign in and rotate your recovery codes immediately. The person who used the code now has an active session — revoke it from your security settings.",
  'recoveryCodeUsed.footer':
    "You're receiving this because a recovery code on your account was just used. These alerts are required and can't be disabled.",
  'signupNotAllowed.preview': 'About your sign-in request',
  'signupNotAllowed.heading': 'No account for this address',
  'signupNotAllowed.fallbackWorkspace': 'this workspace',
  'signupNotAllowed.body': 'Someone asked for a sign-in link for this email address at {where}.',
  'signupNotAllowed.explanation':
    'There is no account here for this address, and {where} is not accepting new accounts. Ask an admin to invite you, then sign in with the address they invite.',
  'signupNotAllowed.footer':
    "If you didn't request this, you can safely ignore this email. No account was created and nothing was changed.",

  // --- Notification footer -------------------------------------------------
  'footer.unsubscribePost': 'Unsubscribe from this post',
  'footer.managePreferences': 'Manage notification preferences',

  // --- Changelog -----------------------------------------------------------
  'changelog.preview': 'New update from {organizationName}: {changelogTitle}',
  'changelog.heading': 'New update published',
  'changelog.body': '{organizationName} just published a product update.',
  'changelog.cta': 'View Update',
  'changelog.reason': "You received this email because you're subscribed to changelog updates.",

  // --- Feedback linked -----------------------------------------------------
  'feedbackLinked.preview': 'Your feedback has been linked to "{postTitle}"',
  'feedbackLinked.heading': 'Your feedback is being tracked!',
  'feedbackLinked.greeting': 'Thanks!',
  'feedbackLinked.greetingNamed': 'Thanks {recipientName}!',
  'feedbackLinked.attributedBy':
    '{attributedByName} from the {workspaceName} team has linked your feedback to a post.',
  'feedbackLinked.attributed': 'Your feedback has been linked to a post on {workspaceName}.',
  'feedbackLinked.followUp':
    "You'll receive updates when the status changes or new comments are posted.",
  'feedbackLinked.cta': 'View Feedback',
  'feedbackLinked.reason':
    'You received this email because your feedback was attributed to this post.',

  // --- New comment ---------------------------------------------------------
  'newComment.preview': 'New comment on "{postTitle}"',
  'newComment.heading': 'New comment on your feedback',
  'newComment.body': '{commenterName} commented on your feedback in {organizationName}.',
  'newComment.bodyTeam': '{commenterName} (Team) commented on your feedback in {organizationName}.',
  'common.label.feedback': 'Feedback',
  'newComment.cta': 'View Comment',
  'common.reason.feedbackSubscribed':
    'You received this email because you submitted or subscribed to this feedback.',

  // --- Status change -------------------------------------------------------
  'statusChange.preview': '{emoji} Your feedback is now {status}',
  'statusChange.heading': '{emoji} Your feedback is now {status}!',
  'statusChange.body':
    'Great news! The status of your feedback has been updated on {organizationName}.',
  'statusChange.cta': 'View Feedback',

  // --- Mentions ------------------------------------------------------------
  'postMention.preview': '{displayName} mentioned you in "{postTitle}"',
  'postMention.heading': 'You were mentioned',
  'postMention.body': '{displayName} mentioned you in {postTitle}.',
  'postMention.cta': 'View Feedback',
  'mention.reason': 'You received this email because you were mentioned in {workspaceName}.',
  'noteMention.preview': '{displayName} mentioned you in an internal note',
  'noteMention.heading': 'You were mentioned in a note',
  'noteMention.body': '{displayName} mentioned you in an internal note on a conversation.',
  'noteMention.visibility': 'Internal notes are visible to your team only.',
  'noteMention.cta': 'Open conversation',

  // --- Status page ---------------------------------------------------------
  'statusIncident.impact.none': 'No impact',
  'statusIncident.impact.minor': 'Minor impact',
  'statusIncident.impact.major': 'Major impact',
  'statusIncident.impact.critical': 'Critical impact',
  'statusIncident.preview': '{incidentTitle} ({statusLabel})',
  'statusIncident.heading': 'New incident reported',
  'statusIncident.body': '{workspaceName} just posted an update to its status page.',
  'statusIncident.cta': 'View live status',
  'status.affectedComponents': 'Affected components',
  'status.reason': "You received this email because you're subscribed to status updates.",
  'statusMaintenance.preview': 'Scheduled maintenance: {maintenanceTitle} ({startLabel})',
  'statusMaintenance.eyebrow': 'Scheduled maintenance',
  'statusMaintenance.body':
    '{workspaceName} has scheduled maintenance that may affect its services.',
  'statusMaintenance.window': 'Maintenance window',
  'statusMaintenance.cta': 'View status page',

  // --- CSAT and conversation close -----------------------------------------
  'csat.heading': 'How did we do?',
  'csat.instruction': 'Click a face above to rate your experience.',
  'csat.reason': 'You received this email because you had a conversation with {workspaceName}.',
  'conversationClosed.introAutoClosed':
    "This conversation was closed because we haven't heard back from you.",
  'conversationClosed.introResolved': '{workspaceName} marked this conversation as resolved.',
  'conversationClosed.followUpAutoClosed':
    'Need anything else? Just reply to this email and the conversation will reopen.',
  'conversationClosed.followUpResolved':
    'Not sorted? Just reply to this email and the conversation will reopen.',
  'common.viewOnline': 'View it online',
  'conversationReply.replyHint': 'Reply to this email to continue the conversation',
  'conversationReply.quoteAttribution': 'On {quoteDate}, {name} wrote:',
  'conversationReply.quoteAttributionNoDate': '{name} wrote:',
} as const
