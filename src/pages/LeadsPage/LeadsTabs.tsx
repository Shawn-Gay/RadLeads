import { cn } from '@/lib/utils'
import { TABS } from './constants'
import type { TabKey } from './constants'

interface LeadsTabsProps {
  activeTab: TabKey
  tabCounts: Record<TabKey, number>
  onTabChange: (tab: TabKey) => void
}

export function LeadsTabs({ activeTab, tabCounts, onTabChange }: LeadsTabsProps) {
  return (
    <div className="bg-card border-b border-border px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
            activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
            {tabCounts[tab.key]}
          </span>
        </button>
      ))}
    </div>
  )
}
