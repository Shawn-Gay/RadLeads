import type { Company, EnrichStatus, EmailSource, EmailStatus, ImportPersonInput, ImportCompanyInput } from '@/types'
import { apiFetch } from '@/lib/api'

const enrichStatusMap: Record<string, EnrichStatus> = {
  NotEnriched: 'not_enriched',
  Researching:  'researching',
  Researched:   'researched',
  Enriching:    'enriching',
  Enriched:     'enriched',
  ResearchFailed: 'research_failed',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompany(raw: any): Company {
  return {
    id:           raw.id,
    domain:       raw.domain,
    name:         raw.name,
    employees:    raw.employees ?? undefined,
    summary:      raw.summary ?? undefined,
    recentNews:   raw.recentNews ?? undefined,
    phone:        raw.phone ?? null,
    enrichStatus: enrichStatusMap[raw.enrichStatus] ?? 'not_enriched',
    researchedAt: raw.researchedAt ?? undefined,
    enrichedAt:   raw.enrichedAt ?? undefined,
    meetingLink:       raw.meetingLink ?? undefined,
    pagesCrawledCount: raw.pagesCrawledCount ?? 0,
    genericEmails: raw.genericEmails ?? [],
    people: (raw.people ?? []).map((p: any) => ({
      id:          p.id,
      firstName:   p.firstName,
      lastName:    p.lastName,
      title:       p.title,
      linkedinUrl: p.linkedinUrl ?? undefined,
      phone:       p.phone ?? null,
      city:        p.city ?? undefined,
      icebreaker:  p.icebreaker ?? undefined,
      painPoint:   p.painPoint ?? undefined,
      sourcePage:  p.sourcePage ?? undefined,
      emails: (p.emails ?? []).map((e: any) => ({
        address:   e.address,
        source:    (e.source as string).toLowerCase() as EmailSource,
        isPrimary: e.isPrimary,
        status:    (e.status as string).toLowerCase() as EmailStatus,
      })),
      campaignIds: p.campaignIds ?? [],
    })),
  }
}

export async function getLeads(): Promise<Company[]> {
  const data = await apiFetch<any[]>('/api/companies')
  return data.map(mapCompany)
}

export async function queueResearch(ids: string[]): Promise<{ queued: number }> {
  return apiFetch('/api/companies/queue-research', {
    method: 'PATCH',
    body: JSON.stringify(ids),
  })
}

export async function queueEnrich(ids: string[]): Promise<{ queued: number }> {
  return apiFetch('/api/companies/queue-enrich', {
    method: 'PATCH',
    body: JSON.stringify(ids),
  })
}

export async function importPeople(people: ImportPersonInput[]): Promise<Company[]> {
  const data = await apiFetch<any[]>('/api/companies/import', {
    method: 'POST',
    body: JSON.stringify(people),
  })
  return data.map(mapCompany)
}

export async function importCompanies(companies: ImportCompanyInput[]): Promise<Company[]> {
  const data = await apiFetch<any[]>('/api/companies/import-companies', {
    method: 'POST',
    body: JSON.stringify(companies),
  })
  return data.map(mapCompany)
}
