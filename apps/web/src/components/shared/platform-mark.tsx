import { useRouteContext } from '@tanstack/react-router'
import { hasPlatformMark } from '@/lib/shared/platform-brand'

/**
 * The platform's own logo + wordmark, shown above the sign-in and invite cards.
 *
 * Upstream inlined `/logo.png` and the literal "Quackback" into each of those
 * pages. This reads the configured platform brand instead and renders
 * **nothing** when none is set, which is the state a fork wants by default:
 * these are pre-auth pages where no workspace branding has loaded yet, so an
 * unconfigured install showing the vendor's mark is showing the wrong product's
 * to someone who has never heard of it.
 */
export function PlatformMark({
  size = 'sm',
  className,
}: {
  /** 'lg' is the onboarding header; 'sm' is the pre-auth card stack. */
  size?: 'sm' | 'lg'
  className?: string
}) {
  const { platformBrand } = useRouteContext({ from: '__root__' })
  if (!hasPlatformMark(platformBrand)) return null
  const brand = platformBrand!
  const large = size === 'lg'
  const mark = (
    <>
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" className={large ? 'h-8 w-8 rounded' : 'h-6 w-6 rounded'} />
      ) : null}
      <span className={large ? 'text-xl font-bold' : 'text-sm font-medium text-muted-foreground'}>
        {brand.name}
      </span>
    </>
  )
  return (
    <div className={className ?? 'mb-8 flex items-center justify-center gap-2'}>
      {brand.url ? (
        <a href={brand.url} className="flex items-center gap-2" target="_blank" rel="noreferrer">
          {mark}
        </a>
      ) : (
        mark
      )}
    </div>
  )
}
