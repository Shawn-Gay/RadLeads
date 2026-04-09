export interface TokenData {
  firstName?: string
  lastName?: string
  company?: string
  city?: string
  icebreaker?: string
  painPoint?: string
  title?: string
  phone?: string
  companyPhone?: string
}

export function fillTokens(template: string, data: TokenData): string {
  return template
    .replace(/\{\{firstName\}\}/g, data.firstName ?? '')
    .replace(/\{\{lastName\}\}/g, data.lastName ?? '')
    .replace(/\{\{company\}\}/g, data.company ?? '')
    .replace(/\{\{city\}\}/g, data.city ?? '')
    .replace(/\{\{icebreaker\}\}/g, data.icebreaker ?? '')
    .replace(/\{\{painPoint\}\}/g, data.painPoint ?? '')
    .replace(/\{\{title\}\}/g, data.title ?? '')
    .replace(/\{\{phone\}\}/g, data.phone ?? '')
    .replace(/\{\{companyPhone\}\}/g, data.companyPhone ?? '')
}

export const CALL_TOKEN_HINTS = [
  '{{firstName}}', '{{lastName}}', '{{company}}', '{{city}}',
  '{{title}}', '{{icebreaker}}', '{{painPoint}}', '{{companyPhone}}',
]
