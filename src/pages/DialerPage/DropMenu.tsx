import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DialDisposition } from '@/types'

interface DropMenuProps {
  companyId: string
  onDrop: (companyId: string, disposition: DialDisposition) => void
}

const DROP_OPTIONS: { label: string; disposition: DialDisposition; color: string }[] = [
  { label: 'Return to pool',  disposition: 'None',          color: 'text-foreground' },
  { label: 'Not Interested',  disposition: 'NotInterested', color: 'text-red-600 dark:text-red-400' },
  { label: 'Bad Number',      disposition: 'BadNumber',     color: 'text-orange-600 dark:text-orange-400' },
  { label: 'Converted',       disposition: 'Converted',     color: 'text-emerald-600 dark:text-emerald-400' },
]

export function DropMenu({ companyId, onDrop }: DropMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Drop lead"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Trash2 className="h-4 w-4" /> Drop
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-40">
            {DROP_OPTIONS.map(o => (
              <button
                key={o.disposition}
                onClick={() => { setOpen(false); onDrop(companyId, o.disposition) }}
                className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors', o.color)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
