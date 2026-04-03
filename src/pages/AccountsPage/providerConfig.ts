import type { AccountProvider } from '@/types'

export const PROVIDERS: {
  id: AccountProvider
  label: string
  description: string
  soon?: boolean
}[] = [
  {
    id: 'namecheap',
    label: 'Namecheap Private Email',
    description: 'Connect via SMTP/IMAP using your Namecheap Private Email credentials.',
  },
  {
    id: 'google',
    label: 'Google Workspace',
    description: 'Authenticate with OAuth — no password required.',
    soon: true,
  },
  {
    id: 'smtp',
    label: 'Custom SMTP',
    description: 'Any email provider that supports SMTP/IMAP access.',
  },
]

export const PROVIDER_DEFAULTS: Record<AccountProvider, { smtpHost: string; smtpPort: string; imapHost: string; imapPort: string }> = {
  namecheap: { smtpHost: 'mail.privateemail.com', smtpPort: '465', imapHost: 'mail.privateemail.com', imapPort: '993' },
  google:    { smtpHost: 'smtp.gmail.com',         smtpPort: '465', imapHost: 'imap.gmail.com',        imapPort: '993' },
  smtp:      { smtpHost: '',                        smtpPort: '465', imapHost: '',                      imapPort: '993' },
}
