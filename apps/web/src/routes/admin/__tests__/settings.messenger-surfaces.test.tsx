// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({ invalidate: vi.fn() }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }
})

const portalSupport: { value: { enabled?: boolean } | undefined } = { value: { enabled: true } }

vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: (opts: { queryKey: string[] }) => {
    if (opts.queryKey.includes('widgetConfig')) {
      return {
        data: {
          tabs: { messenger: true },
          messenger: {
            welcomeMessage: 'Hi',
            offlineMessage: 'Away',
            teamName: 'Support',
            preventRepliesWhenClosed: false,
          },
          translations: {},
        },
      }
    }
    return { data: { support: portalSupport.value } }
  },
}))

vi.mock('@/lib/client/queries/settings', () => ({
  settingsQueries: {
    widgetConfig: () => ({ queryKey: ['settings', 'widgetConfig'] }),
    portalConfig: () => ({ queryKey: ['settings', 'portalConfig'] }),
  },
}))

vi.mock('@/lib/client/mutations/settings', () => ({
  useUpdateWidgetConfig: () => ({ mutateAsync: vi.fn() }),
  useUpdatePortalConfig: () => ({ mutateAsync: vi.fn() }),
}))

const { MessengerChannelPage } = await import('../settings.channels_.messenger')

describe('Messenger Surfaces', () => {
  beforeEach(() => {
    portalSupport.value = { enabled: true }
  })

  it('owns Widget and Portal chats switches', () => {
    render(<MessengerChannelPage />)

    expect(screen.getByRole('heading', { name: 'Surfaces' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Widget' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Portal chats' })).toBeInTheDocument()
    expect(screen.getByText('Show the Messages tab in the widget.')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Let signed-in customers start new conversations from the portal's Support tab."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('Widget settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Portal Support')).not.toBeInTheDocument()
    expect(screen.getByText('Translations')).toBeInTheDocument()
  })
})

/**
 * The Portal chats switch must agree with the portal.
 *
 * `isPortalChatStartEnabled` is fail-closed: an absent `support` section means
 * the Messages tab does not render. The switch used to default to `?? true`,
 * so a workspace that had never touched it saw the toggle already on while the
 * portal showed no tab — and turning it "off then on" was the only way to
 * write the value that actually enabled anything.
 */
describe('Portal chats reflects the portal, not an optimistic default', () => {
  const portalSwitch = () => screen.getByRole('switch', { name: 'Portal chats' })

  it('reads off for a workspace that never set it', () => {
    portalSupport.value = undefined
    render(<MessengerChannelPage />)
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads off when the section exists but the flag was never set', () => {
    portalSupport.value = {}
    render(<MessengerChannelPage />)
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads off when explicitly disabled', () => {
    portalSupport.value = { enabled: false }
    render(<MessengerChannelPage />)
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads on only when explicitly enabled — the same test the portal applies', () => {
    portalSupport.value = { enabled: true }
    render(<MessengerChannelPage />)
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'true')
  })
})
