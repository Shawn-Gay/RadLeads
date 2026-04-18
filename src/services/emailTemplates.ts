import type { EmailTemplate, EmailTemplateStats, CallOutcome } from '@/types'
import { apiFetch } from '@/lib/api'

export async function getEmailTemplates(includeArchived = false): Promise<EmailTemplate[]> {
  return apiFetch<EmailTemplate[]>(`/api/email-templates?includeArchived=${includeArchived}`)
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/api/email-templates/${id}`)
}

export async function createEmailTemplate(name: string, subject: string, body: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>('/api/email-templates', {
    method: 'POST',
    body: JSON.stringify({ name, subject, body }),
  })
}

export async function updateEmailTemplate(id: string, name: string, subject: string, body: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/api/email-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, subject, body }),
  })
}

export async function archiveEmailTemplate(id: string, archived = true): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/api/email-templates/${id}/archive?archived=${archived}`, {
    method: 'POST',
  })
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiFetch<void>(`/api/email-templates/${id}`, { method: 'DELETE' })
}

export async function assignEmailTemplateOutcome(id: string, outcome: CallOutcome, isDefault: boolean): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/api/email-templates/${id}/outcomes`, {
    method: 'POST',
    body: JSON.stringify({ outcome, isDefault }),
  })
}

export async function unassignEmailTemplateOutcome(id: string, outcome: CallOutcome): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/api/email-templates/${id}/outcomes/${outcome}`, {
    method: 'DELETE',
  })
}

export async function getEmailTemplateStats(id: string): Promise<EmailTemplateStats> {
  return apiFetch<EmailTemplateStats>(`/api/email-templates/${id}/stats`)
}
