// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IntlProvider } from 'react-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const updateWidget = vi.fn()
let prevent = false
let assistant: Record<string, unknown> | undefined

vi.mock('@/lib/client/hooks/use-permission', () => ({ usePermission: () => true }))
vi.mock('@tanstack/react-router', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({ invalidate: vi.fn() }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

const portalSupport: { value: { enabled?: boolean } | undefined } = { value: { enabled: true } }
const portalNav: {
  value: { items?: Array<{ id: string; type: string; enabled?: boolean }> } | undefined
} = { value: undefined }

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useSuspenseQuery: (opts: { queryKey: string[] }) => {
      if (opts.queryKey.includes('widgetConfig')) {
        return {
          data: {
            tabs: { messenger: true },
            messenger: {
              welcomeMessage: 'Hi',
              offlineMessage: 'Away',
              teamName: 'Support',
              preventRepliesWhenClosed: prevent,
              assistant,
            },
            translations: {},
          },
        }
      }
      return { data: { support: portalSupport.value, nav: portalNav.value } }
    },
  }
})

vi.mock('@/lib/client/queries/settings', () => ({
  settingsQueries: {
    widgetConfig: () => ({ queryKey: ['settings', 'widgetConfig'] }),
    portalConfig: () => ({ queryKey: ['settings', 'portalConfig'] }),
  },
}))

vi.mock('@/lib/client/mutations/settings', () => ({
  useUpdateWidgetConfig: () => ({ mutateAsync: updateWidget }),
  useUpdatePortalConfig: () => ({ mutateAsync: vi.fn() }),
}))

const { MessengerChannelPage } = await import('@/components/admin/settings/messenger-channel-page')

function renderPage() {
  return render(
    <IntlProvider locale="en" defaultLocale="en">
      <QueryClientProvider client={new QueryClient()}>
        <MessengerChannelPage />
      </QueryClientProvider>
    </IntlProvider>
  )
}

beforeEach(() => {
  updateWidget.mockReset()
  updateWidget.mockResolvedValue({})
  prevent = false
  assistant = undefined
})
afterEach(cleanup)

describe('Messenger Surfaces', () => {
  beforeEach(() => {
    portalSupport.value = { enabled: true }
    portalNav.value = undefined
  })

  it('owns Widget and Portal chats switches', () => {
    renderPage()

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

  it('shows the Support / Channels / Messenger breadcrumb', () => {
    renderPage()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(crumbs.textContent).toMatch(/Support\s*\/\s*Channels\s*\/\s*Messenger/)
    expect(crumbs.querySelector('a[href="/admin/settings/channels"]')).toBeTruthy()
    expect(crumbs.querySelector('a[href="/admin/settings/support"]')).toBeTruthy()
  })
})

describe('Closed conversations reopen switch', () => {
  it('is on when the stored prevent-replies flag is false', () => {
    prevent = false
    renderPage()
    expect(screen.getByRole('heading', { name: 'Closed conversations' })).toBeInTheDocument()
    const toggle = screen.getByRole('switch', { name: 'Reopen when a visitor replies' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText('Prevent replies to closed conversations')).toBeNull()
  })

  it('is off when the stored prevent-replies flag is true', () => {
    prevent = true
    renderPage()
    const toggle = screen.getByRole('switch', { name: 'Reopen when a visitor replies' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('turning it off stores preventRepliesWhenClosed true', async () => {
    prevent = false
    renderPage()
    fireEvent.click(screen.getByRole('switch', { name: 'Reopen when a visitor replies' }))
    await waitFor(() =>
      expect(updateWidget).toHaveBeenCalledWith({ messenger: { preventRepliesWhenClosed: true } })
    )
  })

  it('turning it on stores preventRepliesWhenClosed false', async () => {
    prevent = true
    renderPage()
    fireEvent.click(screen.getByRole('switch', { name: 'Reopen when a visitor replies' }))
    await waitFor(() =>
      expect(updateWidget).toHaveBeenCalledWith({ messenger: { preventRepliesWhenClosed: false } })
    )
  })

  it('says email replies always reopen', () => {
    renderPage()
    expect(screen.getByText(/Email replies always reopen/)).toBeInTheDocument()
  })
})

describe('AI agent row', () => {
  it('reads "The AI agent answers first" with a Configure link', () => {
    assistant = { enabled: true, respond: true }
    renderPage()
    expect(screen.getByText('The AI agent answers first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Configure' }).getAttribute('href')).toBe(
      '/admin/settings/agent'
    )
    expect(screen.queryByText(/Fronting conversations/)).toBeNull()
  })

  it('reads "The AI agent is off" when answering is off or unset', () => {
    for (const value of [{ enabled: true, respond: false }, { enabled: true }]) {
      assistant = value
      const { unmount } = renderPage()
      expect(screen.getByText('The AI agent is off')).toBeInTheDocument()
      expect(screen.queryByText('The AI agent answers first')).toBeNull()
      expect(screen.queryByText('Answering is off.')).toBeNull()
      unmount()
    }
  })
})

describe('Translation chips', () => {
  it('mark the selected locale with the primary style, not green', () => {
    renderPage()
    const selected = screen.getByRole('button', { name: 'English' })
    expect(selected.className.split(' ')).toContain('border-primary')
    expect(selected.className).not.toMatch(/green|emerald/)
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
    renderPage()
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads off when the section exists but the flag was never set', () => {
    portalSupport.value = {}
    renderPage()
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads off when explicitly disabled', () => {
    portalSupport.value = { enabled: false }
    renderPage()
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('reads on only when explicitly enabled — the same test the portal applies', () => {
    portalSupport.value = { enabled: true }
    renderPage()
    expect(portalSwitch()).toHaveAttribute('aria-checked', 'true')
  })
})

/**
 * Portal chats on + the nav item hidden renders no Messages tab, with this
 * page's switch reading on — the state a live workspace ended up in, where the
 * only visible control said the feature was enabled.
 */
describe('Portal chats warns when the portal nav hides the Messages tab', () => {
  const warning = () => screen.queryByText(/Messages tab is hidden in the portal nav/i)

  beforeEach(() => {
    portalSupport.value = { enabled: true }
    portalNav.value = undefined
  })

  it('warns when nav config explicitly hides the tab', () => {
    portalNav.value = { items: [{ id: 'support', type: 'support', enabled: false }] }
    renderPage()
    expect(warning()).toBeInTheDocument()
  })

  it('stays quiet when the nav item is visible', () => {
    portalNav.value = { items: [{ id: 'support', type: 'support' }] }
    renderPage()
    expect(warning()).not.toBeInTheDocument()
  })

  it('stays quiet with no nav config at all', () => {
    renderPage()
    expect(warning()).not.toBeInTheDocument()
  })

  it('stays quiet when Portal chats is off — the switch is not claiming otherwise', () => {
    portalSupport.value = { enabled: false }
    portalNav.value = { items: [{ id: 'support', type: 'support', enabled: false }] }
    renderPage()
    expect(warning()).not.toBeInTheDocument()
  })
})
