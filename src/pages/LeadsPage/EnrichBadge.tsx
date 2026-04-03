import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ENRICH_CONFIG } from './constants'
import type { EnrichStatus } from '@/types'

export function EnrichBadge({ status }: { status: EnrichStatus }) {
  const { label, cls, spin } = ENRICH_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {spin && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {label}
    </span>
  )
}
