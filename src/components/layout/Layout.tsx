import { useState } from 'react'
import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useDarkMode } from "@/hooks/useDarkMode"
import {
  LayoutDashboard,
  Mail,
  MailPlus,
  Users,
  Zap,
  Inbox,
  Server,
  Settings,
  ScrollText,
  BarChart3,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { DialerContextProvider, useDialerContext } from "@/context/DialerContext"
import { useAppContext } from "@/context/AppContext"
import { DialerIdentityModal } from "@/pages/LeadsPage/DialerIdentityModal"
import { AssignLeadsModal }    from "@/pages/LeadsPage/AssignLeadsModal"

type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean }
type NavGroup = { id: string; label: string; items: NavItem[] }

const standaloneItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
]

const navGroups: NavGroup[] = [
  {
    id: "outreach",
    label: "Outreach",
    items: [
      { to: "/campaigns", label: "Campaigns", icon: Mail },
      { to: "/leads",     label: "Leads",     icon: Users },
      { to: "/inbox",     label: "Inbox",     icon: Inbox },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    id: "templates",
    label: "Templates",
    items: [
      { to: "/scripts",         label: "Scripts",         icon: ScrollText },
      { to: "/email-templates", label: "Email Templates", icon: MailPlus },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { to: "/accounts", label: "Accounts", icon: Server },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

function NavLink({ item, currentPath, onNavigate }: { item: NavItem; currentPath: string; onNavigate: () => void }) {
  const active = item.exact ? currentPath === item.to : currentPath.startsWith(item.to)
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function NavGroupSection({
  group,
  currentPath,
  onNavigate,
}: {
  group: NavGroup
  currentPath: string
  onNavigate: () => void
}) {
  const hasActive = group.items.some(o =>
    o.exact ? currentPath === o.to : currentPath.startsWith(o.to)
  )
  const [open, setOpen] = useState(hasActive || group.id === "outreach")

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {group.label}
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-150", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map(o => (
            <NavLink key={o.to} item={o} currentPath={currentPath} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function DialerModals() {
  const { showIdentityModal, setShowIdentityModal, showAssignModal, setShowAssignModal, handleIdentitySelected, handleAssigned, dialerQueue } = useDialerContext()
  const { currentDialer } = useAppContext()

  return (
    <>
      {showIdentityModal && (
        <DialerIdentityModal onSelect={handleIdentitySelected} onDismiss={() => setShowIdentityModal(false)} />
      )}
      {showAssignModal && currentDialer && (
        <AssignLeadsModal
          dialer={currentDialer}
          currentAssignedCount={dialerQueue.length}
          onAssigned={handleAssigned}
          onCancel={() => setShowAssignModal(false)}
        />
      )}
    </>
  )
}

export function Layout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { dark, toggle } = useDarkMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const close = () => setSidebarOpen(false)

  return (
    <DialerContextProvider>
      <div className="flex h-screen bg-background">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
          />
        )}

        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-52 bg-card border-r border-border flex flex-col transition-transform duration-200",
          "md:relative md:translate-x-0 md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-12 flex items-center gap-2 px-5 border-b border-border">
            <Zap className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-sm tracking-tight text-foreground">RadLeads</span>
            <button
              onClick={close}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
            <div className="space-y-0.5">
              {standaloneItems.map(o => (
                <NavLink key={o.to} item={o} currentPath={currentPath} onNavigate={close} />
              ))}
            </div>
            {navGroups.map(o => (
              <NavGroupSection key={o.id} group={o} currentPath={currentPath} onNavigate={close} />
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Radcore AI · v0.1.0</p>
            <button
              onClick={toggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="md:hidden h-12 bg-card border-b border-border flex items-center px-4 gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm tracking-tight text-foreground">RadLeads</span>
            <button
              onClick={toggle}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Outlet />
        </div>

        <DialerModals />
      </div>
    </DialerContextProvider>
  )
}
