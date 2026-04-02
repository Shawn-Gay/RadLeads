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

const routeTree = rootRoute.addChildren([
  indexRoute,
  campaignsRoute,
  campaignEditRoute,
  leadsRoute,
  enrichRoute,
  inboxRoute,
  accountsRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export { Outlet }
