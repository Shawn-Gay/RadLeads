import type { Lead } from '@/types'

export function fillTokens(template: string, lead: Partial<Lead>): string {
  return template
    .replace(/\{\{firstName\}\}/g, lead.firstName ?? '')
    .replace(/\{\{lastName\}\}/g, lead.lastName ?? '')
    .replace(/\{\{company\}\}/g, lead.company ?? '')
    .replace(/\{\{city\}\}/g, lead.city ?? '')
    .replace(/\{\{icebreaker\}\}/g, lead.icebreaker ?? '')
}
