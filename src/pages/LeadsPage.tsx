import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table'
import { Download, Plus, ArrowUpDown } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel'
import { cn } from '@/lib/utils'
import type { Lead, LeadStatus } from '@/types'

type FilterTab = 'all' | LeadStatus

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'replied', label: 'Replied' },
  { key: 'hot', label: 'Hot' },
  { key: 'bounced', label: 'Bounced' },
]

const helper = createColumnHelper<Lead>()

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-muted-foreground'
}

export function LeadsPage() {
  const { leads } = useAppContext()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const filteredData = useMemo(() =>
    activeTab === 'all' ? leads : leads.filter(o => o.status === activeTab),
    [leads, activeTab]
  )

  const columns = useMemo(() => [
    helper.display({
      id: 'select',
      header: () => null,
      cell: () => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer"
          readOnly
        />
      ),
      size: 40,
    }),
    helper.accessor(o => `${o.firstName} ${o.lastName}`, {
      id: 'name',
      header: 'Name / Email',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{row.original.email}</p>
        </div>
      ),
    }),
    helper.accessor('company', {
      header: 'Company',
      cell: info => (
        <span className="text-sm text-foreground truncate block">{info.getValue()}</span>
      ),
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: info => <StatusBadge status={info.getValue()} />,
    }),
    helper.accessor('lastTouched', {
      header: 'Last touch',
      cell: info => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    helper.accessor('score', {
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Score <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: info => (
        <span className={cn('text-sm font-semibold', scoreColor(info.getValue()))}>
          {info.getValue()}
        </span>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function handleExportCsv() {
    const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Title', 'City', 'Status', 'Score']
    const rows = filteredData.map(o => [
      o.firstName, o.lastName, o.email, o.company, o.title, o.city, o.status, String(o.score)
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground mr-auto">Leads</h1>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button
          onClick={() => navigate({ to: '/enrich' })}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Leads
        </button>
      </div>

      {/* Filter tabs */}
      <div className="bg-card border-b border-border px-5 flex items-center gap-1 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {tab.key === 'all' ? leads.length : leads.filter(o => o.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table + detail panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border sticky top-0 z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap"
                      style={{ width: h.column.columnDef.size }}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedLead(
                    selectedLead?.id === row.original.id ? null : row.original
                  )}
                  className={cn(
                    'cursor-pointer hover:bg-muted transition-colors',
                    selectedLead?.id === row.original.id && 'bg-blue-50 dark:bg-blue-950'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        )}
      </div>
    </div>
  )
}
