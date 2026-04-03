import type { InboxMessage } from '@/types'
import { INBOX0 } from '@/data/inbox'

export function getInbox(): Promise<InboxMessage[]> {
  return Promise.resolve(INBOX0)
}
