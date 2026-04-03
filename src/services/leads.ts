import type { Company } from '@/types'
import { COMPANIES0 } from '@/data/leads'

export function getLeads(): Promise<Company[]> {
  return Promise.resolve(COMPANIES0)
}
