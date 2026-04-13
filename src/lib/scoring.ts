import type { Company, CallLog } from '@/types'

export function scoreCompany(company: Company, companyCallLogs: CallLog[]): number {
  let score = 0

  // Company-level data quality
  if (company.phone) score += 20
  if (company.recentNews) score += 20
  if (company.meetingLink) score += 10
  if (company.summary) score += 5

  // People quality (best person drives the score)
  for (const person of company.people) {
    if (person.phone) score += 15
    if (person.icebreaker) score += 10
    if (person.painPoint) score += 10
    if (person.emails.some(o => o.status === 'verified')) score += 10
  }

  // Call history signals
  if (companyCallLogs.length === 0) {
    score += 10 // Fresh lead bonus
  } else {
    if (companyCallLogs.some(o => o.outcome === 'Interested')) score += 50
    if (companyCallLogs.some(o => o.outcome === 'CallBack')) score += 30
    if (companyCallLogs.some(o => o.outcome === 'NotInterested')) score -= 50
    if (companyCallLogs.some(o => o.outcome === 'WrongNumber')) score -= 20
  }

  return score
}
