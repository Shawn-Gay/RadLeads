import { useMemo } from 'react'
import { Plus, Users, UserMinus } from 'lucide-react'
import type { Company, LeadPerson } from '@/types'

interface PersonEntry { person: LeadPerson; company: Company }

interface AudienceTabProps {
  campaignId: string
  companies: Company[]
  onRemove: (personId: string) => void
  onOpenAddLeads: () => void
}

export function AudienceTab({ campaignId, companies, onRemove, onOpenAddLeads }: AudienceTabProps) {
  const audience = useMemo<PersonEntry[]>(() =>
    companies.flatMap(o =>
      o.people
        .filter(p => p.campaignIds.includes(campaignId))
        .map(p => ({ person: p, company: o }))
    ), [companies, campaignId])

  const primaryEmail = (p: LeadPerson) => p.emails.find(e => e.isPrimary) ?? p.emails[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <p className="text-xs text-muted-foreground mr-auto">
          {audience.length} {audience.length === 1 ? 'person' : 'people'} in this campaign
        </p>
        <button
          onClick={onOpenAddLeads}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Leads
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-background">
        {audience.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No leads yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add enriched leads to start sending this campaign.
              </p>
            </div>
            <button
              onClick={onOpenAddLeads}
              className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Leads
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audience.map(({ person, company }) => {
              const email = primaryEmail(person)
              return (
                <div key={person.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 group transition-colors">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {person.firstName[0]}{person.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.title} · {company.domain}
                    </p>
                  </div>
                  {email && (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] shrink-0 hidden sm:block">
                      {email.address}
                    </span>
                  )}
                  <button
                    onClick={() => onRemove(person.id)}
                    title="Remove from campaign"
                    className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
