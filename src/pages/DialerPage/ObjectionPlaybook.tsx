import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fillTokens } from '@/lib/tokens'
import { OBJECTION_PLAYBOOK } from '@/pages/LeadsPage/constants'
import type { TokenData } from '@/lib/tokens'

interface ObjectionPlaybookProps {
  tokenData: TokenData
}

export function ObjectionPlaybook({ tokenData }: ObjectionPlaybookProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors"
      >
        Objection Playbook
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {OBJECTION_PLAYBOOK.map((obj, i) => (
            <div key={i} className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">
                "{obj.trigger}"
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                {fillTokens(obj.response, tokenData)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
