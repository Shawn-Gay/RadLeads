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
  meetingLink?: string
  // Sender persona — populated from selected EmailAccount
  senderFirstName?: string
  senderLastName?: string
  senderTitle?: string
  senderCompany?: string
  senderPhone?: string
  senderCalendarLink?: string
  senderSignature?: string
}

export function fillTokens(template: string, data: TokenData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    (data as Record<string, string | undefined>)[key] ?? ''
  )
}

export const CALL_TOKEN_HINTS = [
  '{{firstName}}', '{{lastName}}', '{{company}}', '{{city}}',
  '{{title}}', '{{icebreaker}}', '{{painPoint}}', '{{companyPhone}}',
]

export const EMAIL_TOKEN_HINTS = [
  '{{firstName}}', '{{company}}', '{{painPoint}}',
  '{{icebreaker}}', '{{meetingLink}}', '{{title}}',
  '{{senderFirstName}}', '{{senderLastName}}', '{{senderTitle}}',
  '{{senderCompany}}', '{{senderPhone}}', '{{senderCalendarLink}}',
  '{{senderSignature}}',
]
