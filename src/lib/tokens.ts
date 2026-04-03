export interface TokenData {
  firstName?: string
  lastName?: string
  company?: string
  city?: string
  icebreaker?: string
}

export function fillTokens(template: string, data: TokenData): string {
  return template
    .replace(/\{\{firstName\}\}/g, data.firstName ?? '')
    .replace(/\{\{lastName\}\}/g, data.lastName ?? '')
    .replace(/\{\{company\}\}/g, data.company ?? '')
    .replace(/\{\{city\}\}/g, data.city ?? '')
    .replace(/\{\{icebreaker\}\}/g, data.icebreaker ?? '')
}
