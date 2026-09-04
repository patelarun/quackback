/**
 * Swedish email copy.
 *
 * Typed as the English catalogue's key set, so adding a key there without a
 * translation here is a compile error rather than an English line arriving in
 * a Swedish inbox.
 *
 * Two liberties are taken against a literal translation, both deliberate:
 * the vendor name is dropped from the sign-in and account subjects (Swedish
 * readers of this install know the product by the workspace name, and the
 * English originals only carry "Quackback" because upstream is the vendor),
 * and "du"-form is used throughout, which is the register Swedish product mail
 * is written in.
 */
import type { EmailCatalogue } from './index'

export const sv: EmailCatalogue = {
  // --- Konversationsmejl (besökare ↔ team) --------------------------------
  'conversation.teamAlert.subjectFallback': 'Nytt meddelande',
  'conversation.teamAlert.heading': 'Nytt meddelande',
  'conversation.teamAlert.introFirst': '{senderName} startade en konversation i {workspaceName}.',
  'conversation.teamAlert.introFollowUp':
    '{senderName} skickade ett nytt meddelande i {workspaceName}.',
  'conversation.teamAlert.cta': 'Öppna inkorgen',
  'conversation.teamAlert.reason':
    'Du får det här mejlet eftersom du är medlem i den här arbetsytan.',
  'conversation.subject.newReply': 'Nytt svar från {workspaceName}',
  'conversation.subject.newMessage': 'Nytt meddelande från {workspaceName}',
  'conversation.intro.agentReply': '{senderName} har svarat på ditt ärende hos {workspaceName}.',
  'conversation.intro.agentStarted':
    '{senderName} från {workspaceName} har skickat ett meddelande till dig.',
  'conversation.cta.viewConversation': 'Visa konversationen',
  'conversation.reason.openConversation':
    'Du får det här mejlet eftersom du har ett pågående ärende hos {workspaceName}.',
  'conversation.reason.workspaceSentMessage':
    'Du får det här mejlet eftersom {workspaceName} har skickat ett meddelande till dig.',

  // --- Konto och inloggning -----------------------------------------------
  'invitation.subject': 'Du har blivit inbjuden till {workspaceName}',
  'portalInvite.subject': 'Du har blivit inbjuden till {workspaceName}',
  'welcome.subject': 'Välkommen till {workspaceName}!',
  'magicLink.subject': 'Din inloggningslänk',
  'signupNotAllowed.subject': 'Angående din inloggningsförfrågan',
  'passwordReset.subject': 'Återställ ditt lösenord',
  'recoveryCodeUsed.subject': 'En återställningskod på ditt konto har just använts',
  'newSignIn.subject': 'Ny inloggning på ditt konto',
  'verifyAddress.subject': 'Bekräfta din e-postadress',

  // --- Feedback, inlägg, nyheter, status ----------------------------------
  'statusChange.subject': 'Din feedback har nu status {status}!',
  'newComment.subject': 'Ny kommentar på ”{postTitle}”',
  'postMention.subject': '{displayName} nämnde dig i ”{postTitle}”',
  'postMention.fallbackName': 'Anonym användare',
  'noteMention.subject': '{displayName} nämnde dig i en intern anteckning',
  'noteMention.fallbackName': 'En kollega',
  'changelog.subject': 'Nyhet: {changelogTitle}',
  'feedbackLinked.subject': 'Din feedback har kopplats till ”{postTitle}”',
  'statusIncident.subject': 'Driftstörning: {incidentTitle}',
  'statusMaintenance.subject': 'Planerat underhåll: {maintenanceTitle}',
  'csat.subject': 'Hur gick det för oss?',

  // --- Ärendehändelser ----------------------------------------------------
  'ticket.requesterReason':
    'Du får det här mejlet eftersom du skapade ärende {ticketLabel} hos {workspaceName}.',
  'ticket.cta.viewTicket': 'Visa ditt ärende',
  'ticket.cta.openInbox': 'Öppna i inkorgen',
  'ticket.created.subject': 'Vi har tagit emot ditt ärende {ticketLabel}: {title}',
  'ticket.created.heading': 'Vi har tagit emot ditt ärende',
  'ticket.created.intro':
    'Ditt ärende {ticketLabel} ”{title}” ligger hos teamet på {workspaceName}. Vi mejlar dig så snart det finns ett svar.',
  'ticket.reply.subject': 'Nytt svar på {ticketLabel}: {title}',
  'ticket.reply.heading': 'Nytt svar på ditt ärende',
  'ticket.reply.intro': '{authorName} svarade på {ticketLabel} ”{title}”:',
  'ticket.reply.fallbackAuthor': 'Teamet',
  'ticket.closed.subject': 'Ditt ärende {ticketLabel} har stängts',
  'ticket.closed.heading': 'Ditt ärende har stängts',
  'ticket.closed.intro': '{ticketLabel} ”{title}” har stängts av teamet på {workspaceName}.',
  'ticket.closed.note':
    'Har du en följdfråga? Svara i ärendetråden — ett svar öppnar ärendet igen.',
  'ticket.resolved.subject': 'Ditt ärende {ticketLabel} har lösts',
  'ticket.resolved.heading': 'Ditt ärende har lösts',
  'ticket.resolved.intro':
    '{ticketLabel} ”{title}” har markerats som löst av teamet på {workspaceName}.',
  'ticket.resolved.note':
    'Svara i ärendetråden om problemet inte är löst för dig — ett svar öppnar ärendet igen.',
  'ticket.assigned.subject': 'Ärende {ticketLabel} har tilldelats dig',
  'ticket.assigned.heading': 'Du har tilldelats ett ärende',
  'ticket.assigned.intro': '{ticketLabel} ”{title}” har tilldelats dig.',
  'ticket.assigned.reason': 'Du får det här mejlet eftersom ärendet tilldelades dig.',
  'ticket.assignedTeam.subject': 'Ärende {ticketLabel} har tilldelats ditt team',
  'ticket.assignedTeam.heading': 'Ett ärende har tilldelats ditt team',
  'ticket.assignedTeam.intro': '{ticketLabel} ”{title}” har tilldelats ditt team.',
  'ticket.assignedTeam.reason': 'Du får det här mejlet eftersom ärendet tilldelades ditt team.',
  'ticket.sla.defaultClock': 'svar',
  'ticket.sla.defaultDue': 'snart',
  'ticket.sla.defaultDuePast': 'tidigare',
  'ticket.sla.reason': 'Du får det här mejlet eftersom du ansvarar för den här konversationen.',
  'ticket.slaWarning.subject': 'SLA i riskzonen: {clockLabel} ska ske {dueLabel}',
  'ticket.slaWarning.heading': 'SLA för {clockLabel} närmar sig överskridande',
  'ticket.slaWarning.intro': 'Konversationen med {title} behöver ett {clockLabel} snart.',
  'ticket.slaWarning.factLine': '{clockLabel} ska ske {dueLabel}',
  'ticket.slaBreach.subject': 'SLA överskridet: {clockLabel} för {title}',
  'ticket.slaBreach.heading': 'SLA för {clockLabel} är överskridet',
  'ticket.slaBreach.intro': 'Konversationen med {title} har passerat sitt mål för {clockLabel}.',
  'ticket.slaBreach.factLine': '{clockLabel} skulle ha skett {dueLabel}',

  // --- Delade textfragment -------------------------------------------------
  'common.copyLink': 'Eller kopiera och klistra in den här länken i din webbläsare:',

  // --- Inloggningsmejl ----------------------------------------------------
  'magicLink.preview': 'Din inloggningslänk',
  'magicLink.heading': 'Logga in',
  'magicLink.body': 'Klicka på knappen nedan för att slutföra inloggningen.',
  'magicLink.cta': 'Logga in',
  'magicLink.codeIntro': 'Eller ange den här koden på inloggningssidan:',
  'magicLink.expiry': 'Länken och koden går ut om 10 minuter.',
  'magicLink.ignore': 'Om du inte begärde detta kan du bortse från det här mejlet.',

  // --- Lösenordsåterställning ---------------------------------------------
  'passwordReset.preview': 'Återställ ditt lösenord',
  'passwordReset.heading': 'Återställ ditt lösenord',
  'passwordReset.body':
    'Klicka på knappen nedan för att välja ett nytt lösenord. Länken går ut om 24 timmar.',
  'passwordReset.cta': 'Återställ lösenord',
  'passwordReset.ignore':
    'Om du inte begärde en lösenordsåterställning kan du bortse från det här mejlet.',

  // --- Verifiering av e-postadress ----------------------------------------
  'verifyAddress.preview': 'Din verifieringskod',
  'verifyAddress.previewFor': 'Din verifieringskod för {workspaceName}',
  'verifyAddress.heading': 'Bekräfta din e-postadress',
  'verifyAddress.body': 'Ange den här koden för att bekräfta adressen. Den går ut om 10 minuter.',
  'verifyAddress.bodyFor':
    'Ange den här koden för {workspaceName} för att bekräfta adressen. Den går ut om 10 minuter.',
  'verifyAddress.ignore':
    'Om du inte har bett om detta kan du bortse från mejlet — inget ändras utan koden.',
  'verifyAddress.footer':
    'Du får det här mejlet eftersom någon angav den här adressen på ett konto. Den används inte till något förrän den har bekräftats.',

  // --- Välkomstmejl -------------------------------------------------------
  'welcome.preview': 'Välkommen till {workspaceName}',
  'welcome.heading': 'Välkommen!',
  'welcome.body':
    'Hej {name}, din arbetsyta {workspaceName} är klar. Börja samla in och hantera kundfeedback redan i dag.',
  'welcome.feature.boards': 'Skapa feedbacktavlor',
  'welcome.feature.team': 'Bjud in ditt team',
  'welcome.feature.roadmap': 'Dela din publika roadmap',
  'welcome.feature.integrations': 'Koppla GitHub, Slack och Discord',
  'welcome.cta': 'Gå till kontrollpanelen',
  'welcome.signOff': 'Lycka till med insamlingen!',
  'welcome.signature': 'Teamet',

  // --- Inbjudan till teamet -----------------------------------------------
  'invitation.preview': 'Gå med i {organizationName}',
  'invitation.heading': 'Du är inbjuden!',
  'invitation.headingNamed': 'Hej {inviteeName}, du är inbjuden!',
  'invitation.body': '{invitedByName} har bjudit in dig till {organizationName}.',
  'invitation.cta': 'Acceptera inbjudan',
  'invitation.ignore': 'Om du inte väntade dig den här inbjudan kan du bortse från mejlet.',

  // --- Inbjudan till portalen ---------------------------------------------
  'portalInvite.preview': 'Du har blivit inbjuden till portalen för {workspaceName}',
  'portalInvite.heading': 'Du är inbjuden!',
  'portalInvite.body':
    'Du har blivit inbjuden till portalen för {workspaceName}. Klicka nedan för att acceptera och logga in.',
  'portalInvite.cta': 'Acceptera inbjudan',
  'portalInvite.ignore': 'Om du inte väntade dig den här inbjudan kan du bortse från mejlet.',

  // --- Säkerhetsaviseringar -----------------------------------------------
  'common.label.when': 'När:',
  'common.label.device': 'Enhet:',
  'newSignIn.preview': 'En ny inloggning har upptäckts på ditt konto',
  'newSignIn.heading': 'Ny inloggning på ditt konto',
  'newSignIn.body': 'Någon loggade just in på ditt konto från en enhet vi inte sett tidigare.',
  'newSignIn.bodyFor':
    'Någon loggade just in på ditt konto hos {workspaceName} från en enhet vi inte sett tidigare.',
  'newSignIn.label.ip': 'IP:',
  'newSignIn.advice':
    'Var det du behöver du inte göra något. Var det inte du: byt lösenord och logga ut alla andra aktiva sessioner.',
  'newSignIn.footer':
    'Du får det här mejlet eftersom en ny inloggning upptäcktes på ditt konto. Den här aviseringen är obligatorisk och går inte att stänga av.',
  'recoveryCodeUsed.preview': 'En återställningskod har använts för inloggning',
  'recoveryCodeUsed.previewFor':
    'En återställningskod har använts för inloggning hos {workspaceName}',
  'recoveryCodeUsed.heading': 'En återställningskod har använts',
  'recoveryCodeUsed.body':
    'Någon loggade in på ditt konto med en av dina sparade återställningskoder.',
  'recoveryCodeUsed.bodyFor':
    'Någon loggade in på ditt konto hos {workspaceName} med en av dina sparade återställningskoder.',
  'recoveryCodeUsed.label.ip': 'IP-adress:',
  'recoveryCodeUsed.adviceYou':
    'Var det du behöver du inte göra något. Koden är nu förbrukad och kan inte återanvändas.',
  'recoveryCodeUsed.adviceNotYou':
    'Var det inte du: logga in och byt ut dina återställningskoder omedelbart. Personen som använde koden har nu en aktiv session — avsluta den i dina säkerhetsinställningar.',
  'recoveryCodeUsed.footer':
    'Du får det här mejlet eftersom en återställningskod på ditt konto just användes. Den här aviseringen är obligatorisk och går inte att stänga av.',
  'signupNotAllowed.preview': 'Angående din inloggningsförfrågan',
  'signupNotAllowed.heading': 'Det finns inget konto för den här adressen',
  'signupNotAllowed.fallbackWorkspace': 'den här arbetsytan',
  'signupNotAllowed.body':
    'Någon begärde en inloggningslänk för den här e-postadressen hos {where}.',
  'signupNotAllowed.explanation':
    'Det finns inget konto för den här adressen, och {where} tar inte emot nya konton. Be en administratör bjuda in dig och logga sedan in med den adress de bjuder in.',
  'signupNotAllowed.footer':
    'Om du inte begärde detta kan du bortse från mejlet. Inget konto skapades och inget ändrades.',

  // --- Aviseringsfot -------------------------------------------------------
  'footer.unsubscribePost': 'Avsluta prenumerationen på det här inlägget',
  'footer.managePreferences': 'Hantera aviseringsinställningar',

  // --- Nyheter -------------------------------------------------------------
  'changelog.preview': 'Nyhet från {organizationName}: {changelogTitle}',
  'changelog.heading': 'Ny uppdatering publicerad',
  'changelog.body': '{organizationName} har just publicerat en produktuppdatering.',
  'changelog.cta': 'Visa uppdateringen',
  'changelog.reason': 'Du får det här mejlet eftersom du prenumererar på produktnyheter.',

  // --- Kopplad feedback ----------------------------------------------------
  'feedbackLinked.preview': 'Din feedback har kopplats till ”{postTitle}”',
  'feedbackLinked.heading': 'Din feedback följs nu',
  'feedbackLinked.greeting': 'Tack!',
  'feedbackLinked.greetingNamed': 'Tack {recipientName}!',
  'feedbackLinked.attributedBy':
    '{attributedByName} i teamet på {workspaceName} har kopplat din feedback till ett inlägg.',
  'feedbackLinked.attributed': 'Din feedback har kopplats till ett inlägg hos {workspaceName}.',
  'feedbackLinked.followUp':
    'Du får uppdateringar när statusen ändras eller när nya kommentarer publiceras.',
  'feedbackLinked.cta': 'Visa feedbacken',
  'feedbackLinked.reason':
    'Du får det här mejlet eftersom din feedback kopplades till det här inlägget.',

  // --- Ny kommentar --------------------------------------------------------
  'newComment.preview': 'Ny kommentar på ”{postTitle}”',
  'newComment.heading': 'Ny kommentar på din feedback',
  'newComment.body': '{commenterName} kommenterade din feedback hos {organizationName}.',
  'newComment.bodyTeam':
    '{commenterName} (teamet) kommenterade din feedback hos {organizationName}.',
  'common.label.feedback': 'Feedback',
  'newComment.cta': 'Visa kommentaren',
  'common.reason.feedbackSubscribed':
    'Du får det här mejlet eftersom du skickade in eller prenumererar på den här feedbacken.',

  // --- Statusändring -------------------------------------------------------
  'statusChange.preview': '{emoji} Din feedback har nu status {status}',
  'statusChange.heading': '{emoji} Din feedback har nu status {status}!',
  'statusChange.body':
    'Goda nyheter! Statusen på din feedback har uppdaterats hos {organizationName}.',
  'statusChange.cta': 'Visa feedbacken',

  // --- Omnämnanden ---------------------------------------------------------
  'postMention.preview': '{displayName} nämnde dig i ”{postTitle}”',
  'postMention.heading': 'Du blev omnämnd',
  'postMention.body': '{displayName} nämnde dig i {postTitle}.',
  'postMention.cta': 'Visa feedbacken',
  'mention.reason': 'Du får det här mejlet eftersom du blev omnämnd hos {workspaceName}.',
  'noteMention.preview': '{displayName} nämnde dig i en intern anteckning',
  'noteMention.heading': 'Du blev omnämnd i en anteckning',
  'noteMention.body': '{displayName} nämnde dig i en intern anteckning på en konversation.',
  'noteMention.visibility': 'Interna anteckningar syns bara för ditt team.',
  'noteMention.cta': 'Öppna konversationen',

  // --- Statussida ----------------------------------------------------------
  'statusIncident.impact.none': 'Ingen påverkan',
  'statusIncident.impact.minor': 'Mindre påverkan',
  'statusIncident.impact.major': 'Stor påverkan',
  'statusIncident.impact.critical': 'Kritisk påverkan',
  'statusIncident.preview': '{incidentTitle} ({statusLabel})',
  'statusIncident.heading': 'Ny driftstörning rapporterad',
  'statusIncident.body': '{workspaceName} har just publicerat en uppdatering på sin statussida.',
  'statusIncident.cta': 'Visa aktuell status',
  'status.affectedComponents': 'Berörda komponenter',
  'status.reason': 'Du får det här mejlet eftersom du prenumererar på statusuppdateringar.',
  'statusMaintenance.preview': 'Planerat underhåll: {maintenanceTitle} ({startLabel})',
  'statusMaintenance.eyebrow': 'Planerat underhåll',
  'statusMaintenance.body': '{workspaceName} har planerat underhåll som kan påverka tjänsterna.',
  'statusMaintenance.window': 'Underhållsfönster',
  'statusMaintenance.cta': 'Visa statussidan',

  // --- Nöjdhet och avslutad konversation -----------------------------------
  'csat.heading': 'Hur gick det för oss?',
  'csat.instruction': 'Klicka på en symbol ovan för att betygsätta din upplevelse.',
  'csat.reason': 'Du får det här mejlet eftersom du har haft en konversation med {workspaceName}.',
  'conversationClosed.introAutoClosed':
    'Den här konversationen stängdes eftersom vi inte har hört från dig.',
  'conversationClosed.introResolved': '{workspaceName} har markerat konversationen som löst.',
  'conversationClosed.followUpAutoClosed':
    'Behöver du något mer? Svara på det här mejlet så öppnas konversationen igen.',
  'conversationClosed.followUpResolved':
    'Inte löst? Svara på det här mejlet så öppnas konversationen igen.',
  'common.viewOnline': 'Visa online',
  'conversationReply.replyHint': 'Svara på det här mejlet för att fortsätta konversationen',
  'conversationReply.quoteAttribution': 'Den {quoteDate} skrev {name}:',
  'conversationReply.quoteAttributionNoDate': '{name} skrev:',
}
