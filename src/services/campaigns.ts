import type { Campaign } from '@/types'
import { CAMPAIGNS0 } from '@/data/campaigns'

export function getCampaigns(): Promise<Campaign[]> {
  return Promise.resolve(CAMPAIGNS0)
}
