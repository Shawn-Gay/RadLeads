import type { EmailAccount, WarmupActivity, WarmupBatch } from '@/types'
import { ACCOUNTS0, WARMUP_ACTIVITIES0, BATCHES0 } from '@/data/accounts'

export function getAccounts(): Promise<EmailAccount[]> {
  return Promise.resolve(ACCOUNTS0)
}

export function getWarmupActivities(): Promise<WarmupActivity[]> {
  return Promise.resolve(WARMUP_ACTIVITIES0)
}

export function getWarmupBatches(): Promise<WarmupBatch[]> {
  return Promise.resolve(BATCHES0)
}
