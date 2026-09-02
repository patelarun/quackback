'use client'

import { useIntl } from 'react-intl'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/shared/utils'
import { SUPPORTED_LOCALES, setVisitorLocaleCookie, type SupportedLocale } from '@/lib/shared/i18n'

/**
 * Each language named in itself, never translated -- someone looking for their
 * own language scans for the word they recognize, which is not the English
 * name of it.
 */
const LANGUAGE_ENDONYMS: Record<SupportedLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  sv: 'Svenska',
  ar: 'العربية',
  ru: 'Русский',
  'pt-br': 'Português (Brasil)',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
}

interface PortalLanguageMenuProps {
  /** The locale the page is currently rendered in. */
  currentLocale: SupportedLocale
}

/**
 * Lets a visitor override the workspace's default language for every
 * customer-facing page.
 *
 * This is what makes an enforced default acceptable: the workspace decides
 * which language everyone lands on, and this is the way out of it. The choice
 * is stored in a site-wide cookie that outranks both the workspace default and
 * Accept-Language (see `resolveCustomerFacingLocale`).
 */
export function PortalLanguageMenu({ currentLocale }: PortalLanguageMenuProps) {
  const intl = useIntl()

  function chooseLanguage(locale: SupportedLocale) {
    setVisitorLocaleCookie(locale)
    // The locale is resolved server-side in the portal layout loader, so a
    // client-side re-render would leave the page in the old language. Reload
    // in place, keeping the visitor on the page they were reading.
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <GlobeAltIcon className="h-4 w-4" />
          <span className="sr-only">
            {intl.formatMessage({
              id: 'portal.header.language.label',
              defaultMessage: 'Change language',
            })}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => chooseLanguage(locale)}
            className={cn(locale === currentLocale && 'bg-accent')}
          >
            {LANGUAGE_ENDONYMS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
