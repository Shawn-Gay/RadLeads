import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { Layout } from "@/components/layout/Layout"
import { DashboardPage } from "@/pages/DashboardPage"
import { CampaignsPage } from "@/pages/CampaignsPage"
import { LeadsPage } from "@/pages/LeadsPage"
import { EnrichPage } from "@/pages/EnrichPage"
import { CampaignEditPage } from "@/pages/CampaignEditPage"
import { InboxPage } from "@/pages/InboxPage"
import { AccountsPage } from "@/pages/AccountsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { ScriptsPage } from "@/pages/ScriptsPage"
import { EmailTemplatesPage } from "@/pages/EmailTemplatesPage"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { DialerPage } from "@/pages/DialerPage"

const rootRoute = createRootRoute({ component: Layout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
})

const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns",
  component: CampaignsPage,
})

const campaignEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId",
  component: CampaignEditPage,
})

const leadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leads",
  component: LeadsPage,
})

const enrichRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/enrich",
  component: EnrichPage,
})

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inbox",
  component: InboxPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accounts",
  component: AccountsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
})

const scriptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scripts",
  component: ScriptsPage,
})

const emailTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/email-templates",
  component: EmailTemplatesPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: AnalyticsPage,
})

const dialerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dialer",
  component: DialerPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  campaignsRoute,
  campaignEditRoute,
  leadsRoute,
  enrichRoute,
  inboxRoute,
  accountsRoute,
  settingsRoute,
  scriptsRoute,
  emailTemplatesRoute,
  analyticsRoute,
  dialerRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export { Outlet }
