// Enrichment service — server-side implementation pending.
// Domain-based enrichment (scraping, email guessing, SMTP verification)
// will be handled by the server. UI simulation is done in LeadsPage.

import { FIRST_NAMES, LAST_NAMES, TITLES, CITIES, EMPLOYEE_RANGES } from '@/data/enrichment'

function seededInt(seed: string, min: number, max: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  const abs = Math.abs(hash)
  return min + (abs % (max - min + 1))
}

function seededPick<T>(seed: string, arr: T[]): T {
  return arr[seededInt(seed, 0, arr.length - 1)]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function domainToCompanyName(domain: string): string {
  const base = domain.split('.')[0]
  // Convert camelCase / kebab to words
  const words = base
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(capitalize)
  return words.join(' ') + (words.length === 1 ? ' Roofing' : '')
}

interface EnrichDomainResult {
  company: string
  domain: string
  firstName: string
  lastName: string
  title: string
  email: string
  phone: string | null
  city: string
  employees: string
  recentNews: string
  painPoint: string
  icebreaker: string
}

export async function enrichDomain(
  domain: string,
  signal?: AbortSignal
): Promise<EnrichDomainResult> {
  const delay = 800 + seededInt(domain, 0, 1200)
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delay)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

  const company = domainToCompanyName(domain)
  const firstName = seededPick(domain + 'fn', FIRST_NAMES)
  const lastName = seededPick(domain + 'ln', LAST_NAMES)
  const title = seededPick(domain + 'ti', TITLES)
  const city = seededPick(domain + 'ci', CITIES)
  const employees = seededPick(domain + 'em', EMPLOYEE_RANGES)

  return {
    company,
    domain,
    firstName,
    lastName,
    title,
    email: `${firstName.toLowerCase()}@${domain}`,
    phone: seededInt(domain + 'ph', 0, 3) > 0 ? `(${seededInt(domain + 'ac', 200, 999)}) 555-${String(seededInt(domain + 'nu', 1000, 9999))}` : null,
    city,
    employees,
    recentNews: `${company} has been growing steadily in the ${city.split(',')[0]} area, recently completing several high-profile roofing projects that have strengthened their local reputation.`,
    painPoint: `As a ${employees}-person shop, ${company} likely struggles with generating a consistent flow of qualified leads without relying entirely on referrals and word of mouth.`,
    icebreaker: `I noticed ${company} has been doing some impressive work in the ${city.split(',')[0]} market — looks like you\'ve built a solid reputation there.`,
  }
}
