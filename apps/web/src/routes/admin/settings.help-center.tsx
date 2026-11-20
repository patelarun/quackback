import { useState, useTransition } from 'react'
import { PERMISSIONS } from '@/lib/shared/permissions'
import { assertRoutePermission } from '@/lib/shared/route-permission'
import { createFileRoute, useRouter, useNavigate, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { SettingsPage } from '@/components/admin/settings/settings-page'
import { HeaderLinksCard } from '@/components/admin/settings/help-center/header-links-card'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { InlineSpinner } from '@/components/admin/settings/inline-spinner'
import { SettingRow, SettingRows } from '@/components/admin/settings/setting-row'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DomainsLanguagesTab } from '@/components/admin/settings/help-center/domains-languages-tab'
import { settingsQueries } from '@/lib/client/queries/settings'
import {
  useUpdateHelpCenterConfig,
  useUpdateHelpCenterAccess,
} from '@/lib/client/mutations/settings'
import { useDebouncedSave } from '@/lib/client/hooks/use-debounced-save'
import { isProductEnabled, type HelpCenterConfig } from '@/lib/shared/types/settings'
import { adminPageHead } from '@/lib/client/admin-head'

/**
 * Split by concern, matching the Access & Security page's `?tab=` pattern:
 *  - `general`            — homepage chrome
 *  - `domains-languages`  — custom domain, redirect rules, indexing (IA:
 *                           Products > Help Center > Domains & languages)
 */
const searchSchema = z.object({
  tab: z.enum(['general', 'domains-languages']).optional(),
})

export const Route = createFileRoute('/admin/settings/help-center')({
  head: adminPageHead('Help center settings'),
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!isProductEnabled(context.settings?.featureFlags, 'helpCenter')) {
      throw redirect({ to: '/admin/settings/general' })
    }
  },
  loader: async ({ context }) => {
    assertRoutePermission(context.permissions, PERMISSIONS.HELP_CENTER_MANAGE)

    const { queryClient } = context
    await queryClient.ensureQueryData(settingsQueries.helpCenterConfig())
    return {}
  },
  component: HelpCenterSettingsRoute,
})

function HelpCenterSettingsRoute() {
  return <HelpCenterSettingsPage />
}

function HelpCenterSettingsPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const tab = search.tab ?? 'general'
  const updateHelpCenterConfig = useUpdateHelpCenterConfig()
  const helpCenterConfigQuery = useSuspenseQuery(settingsQueries.helpCenterConfig())
  const config = helpCenterConfigQuery.data as HelpCenterConfig

  const [homepageTitle, setHomepageTitle] = useState(config.homepageTitle)
  const [homepageDescription, setHomepageDescription] = useState(config.homepageDescription)
  const [, startTransition] = useTransition()

  // A failed save shows the shared autosave toast, so nothing is caught here.
  function saveField(data: Parameters<typeof updateHelpCenterConfig.mutate>[0]) {
    updateHelpCenterConfig.mutate(data, {
      onSuccess: () => startTransition(() => router.invalidate()),
    })
  }

  // Debounced homepage title/description saves. `useDebouncedSave` flushes
  // any pending value on unmount, so navigating away mid-debounce no longer
  // drops it.
  const { queue: queueTitleSave } = useDebouncedSave<string>((value) => {
    if (value.trim()) {
      saveField({ homepageTitle: value.trim() })
    }
  }, 800)

  const { queue: queueDescriptionSave } = useDebouncedSave<string>((value) => {
    saveField({ homepageDescription: value })
  }, 800)

  function handleTitleChange(value: string) {
    setHomepageTitle(value)
    queueTitleSave(value)
  }

  function handleDescriptionChange(value: string) {
    setHomepageDescription(value)
    queueDescriptionSave(value)
  }

  return (
    <SettingsPage page="/admin/settings/help-center">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          void navigate({
            to: '/admin/settings/help-center',
            search: (prev) => ({ ...prev, tab: next as 'general' | 'domains-languages' }),
            replace: true,
          })
        }}
        variant="line"
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="domains-languages">Domains & languages</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <AccessCard visibility={config.access?.visibility ?? 'public'} />

          <SettingsCard title="Homepage" description="Customize the help center landing page.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="homepage-title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="homepage-title"
                  value={homepageTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="How can we help?"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="homepage-description" className="text-sm font-medium">
                  Description
                </Label>
                <Input
                  id="homepage-description"
                  value={homepageDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Search our knowledge base or browse by category"
                />
              </div>
            </div>
          </SettingsCard>

          <HeaderLinksCard links={config.headerLinks ?? []} />
        </TabsContent>

        <TabsContent value="domains-languages">
          <DomainsLanguagesTab config={config} />
        </TabsContent>
      </Tabs>
    </SettingsPage>
  )
}

// ============================================================================
// Access
// ============================================================================

/**
 * The help-center login gate. Off (the default) is the historical behaviour:
 * /hc is readable by anyone, crawlers included. On restricts every
 * help-center read to signed-in customers — the Help tab stays in the portal
 * nav, but the page renders a login card instead of articles.
 *
 * Distinct from Security > Portal visibility, which walls off the whole
 * portal. This toggle only narrows the help center, so a workspace can keep
 * its feedback board open while its documentation is customers-only.
 */
function AccessCard({ visibility }: { visibility: 'public' | 'authenticated' }) {
  const updateAccess = useUpdateHelpCenterAccess()
  const [loginRequired, setLoginRequired] = useState(visibility === 'authenticated')

  function handleLoginRequiredChange(next: boolean) {
    setLoginRequired(next)
    updateAccess.mutate({ visibility: next ? 'authenticated' : 'public' })
  }

  return (
    <SettingsCard title="Access" description="Control who can read your help center">
      <SettingRows>
        <SettingRow
          label="Require sign-in to read the help center"
          description="On, visitors still see the Help tab but must log in or sign up to open it. Articles are also removed from the sitemap, disallowed in robots.txt, and withheld from every public help center API."
          htmlFor="hc-login-required"
          control={
            <div className="flex items-center gap-2">
              <InlineSpinner visible={updateAccess.isPending} />
              <Switch
                id="hc-login-required"
                checked={loginRequired}
                onCheckedChange={handleLoginRequiredChange}
                disabled={updateAccess.isPending}
                aria-label="Require sign-in to read the help center"
              />
            </div>
          }
        />
      </SettingRows>
    </SettingsCard>
  )
}
