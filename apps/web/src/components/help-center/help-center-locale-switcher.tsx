import { GlobeAltIcon } from '@heroicons/react/24/outline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { localizedHcPath } from '@/lib/shared/help-center-url'
import { setVisitorLocaleCookie, type SupportedLocale } from '@/lib/shared/i18n'

/** Sticky manual override so browser-detect doesn't fight an explicit choice. */
export const HC_LOCALE_COOKIE = 'hc_locale'

const LOCALE_LABELS: Record<string, string> = {
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

interface HelpCenterLocaleSwitcherProps {
  currentLocale: string
  defaultLocale: string
  additionalLocales: string[]
  /** The unprefixed /hc path of the page currently being viewed. */
  canonicalPath: string
}

/**
 * Manual locale switcher (domains/languages §2), rendered on every /hc page
 * so it's reachable regardless of default vs. locale-prefixed subtree.
 * Hidden entirely when no additional locale is enabled.
 */
export function HelpCenterLocaleSwitcher({
  currentLocale,
  defaultLocale,
  additionalLocales,
  canonicalPath,
}: HelpCenterLocaleSwitcherProps) {
  if (additionalLocales.length === 0) return null

  const locales = [defaultLocale, ...additionalLocales]

  function handleChange(next: string) {
    if (typeof document !== 'undefined') {
      // 1 year, readable by the server for the browser-detect redirect on /hc.
      document.cookie = `${HC_LOCALE_COOKIE}=${next}; path=/hc; max-age=31536000; samesite=lax`
      // Picking an article language picks the page language too -- without
      // this the visitor reads Swedish articles under English chrome, since
      // the portal resolves its own locale independently of the /hc path.
      setVisitorLocaleCookie(next as SupportedLocale)
    }
    const target = localizedHcPath(next, canonicalPath, defaultLocale)
    // A full navigation, not a client-side one: the chrome locale is resolved
    // in the portal layout loader during SSR, which a child navigation would
    // not re-run, leaving the new language only half-applied.
    if (typeof window !== 'undefined') window.location.href = target
  }

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-8 gap-1.5 rounded-full text-xs" aria-label="Language">
        <GlobeAltIcon className="h-3.5 w-3.5" />
        <SelectValue>{LOCALE_LABELS[currentLocale] ?? currentLocale}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALE_LABELS[locale] ?? locale}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
