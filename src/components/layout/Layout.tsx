import { Link, Outlet, useRouterState } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useDarkMode } from "@/hooks/useDarkMode"
import {
  LayoutDashboard,
  Mail,
  Users,
  Zap,
  Search,
  Inbox,
  Server,
  Sun,
  Moon,
} from "lucide-react"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/campaigns", label: "Campaigns", icon: Mail },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/enrich", label: "Enrich", icon: Search },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/accounts", label: "Accounts", icon: Server },
]

export function Layout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { dark, toggle } = useDarkMode()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-card border-r border-border flex flex-col">
        <div className="h-12 flex items-center gap-2 px-5 border-b border-border">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-sm tracking-tight text-foreground">RadLeads</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact
              ? currentPath === item.to
              : currentPath.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
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
          })}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
