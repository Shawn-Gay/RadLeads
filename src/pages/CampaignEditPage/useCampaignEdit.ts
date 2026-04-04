import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { generateCampaignStep } from '@/services/ai'
import type { Campaign, CampaignStep } from '@/types'

export type TabKey = 'sequence' | 'senders' | 'audience'

export function useCampaignEdit() {
  const params = useParams({ strict: false }) as { campaignId?: string }
  const {
    campaigns, companies, accounts,
    updateCampaign, enrollPeopleInCampaign, removePersonFromCampaign,
  } = useAppContext()

  const campaignId = params.campaignId ?? ''
  const source = campaigns.find(o => o.id === campaignId)

  const [draft, setDraft]                   = useState<Campaign | null>(source ?? null)
  const [generatingStep, setGeneratingStep] = useState<string | null>(null)
  const [previewStepIdx, setPreviewStepIdx] = useState(0)
  const [activeTab, setActiveTab]           = useState<TabKey>('sequence')
  const [showAddLeads, setShowAddLeads]     = useState(false)

  useEffect(() => {
    if (source && !draft) setDraft(source)
  }, [source, draft])

  const audienceCount = companies.reduce((n, o) =>
    n + o.people.filter(p => p.campaignIds.includes(campaignId)).length, 0)

  const senderCount = draft?.senderIds.length ?? 0

  const firstPerson = companies
    .flatMap(o => o.people.map(p => ({ ...p, company: o })))
    .find(p => p.company.enrichStatus === 'enriched')

  const previewLead = firstPerson
    ? {
        firstName:  firstPerson.firstName,
        lastName:   firstPerson.lastName,
        company:    firstPerson.company.name,
        city:       firstPerson.city ?? '',
        icebreaker: firstPerson.icebreaker ?? '',
      }
    : null

  const previewStep = draft?.steps[previewStepIdx] ?? null

  function save(updated: Campaign) {
    setDraft(updated)
    updateCampaign(updated)
  }

  function updateStep(stepId: string, partial: Partial<CampaignStep>) {
    if (!draft) return
    save({ ...draft, steps: draft.steps.map(o => o.id === stepId ? { ...o, ...partial } : o) })
  }

  function removeStep(stepId: string) {
    if (!draft) return
    save({ ...draft, steps: draft.steps.filter(o => o.id !== stepId) })
    if (previewStepIdx >= draft.steps.length - 1) setPreviewStepIdx(Math.max(0, previewStepIdx - 1))
  }

  function addStep() {
    if (!draft) return
    const lastDay = draft.steps.length > 0 ? draft.steps[draft.steps.length - 1].day : 0
    save({ ...draft, steps: [...draft.steps, { id: crypto.randomUUID(), day: lastDay + 3, subject: '', body: '' }] })
  }

  async function handleAiWrite(stepIdx: number) {
    if (!draft) return
    const step = draft.steps[stepIdx]
    setGeneratingStep(step.id)
    try {
      const result = await generateCampaignStep(stepIdx, draft.steps.length, step.day)
      updateStep(step.id, result)
    } finally {
      setGeneratingStep(null)
    }
  }

  function toggleStatus() {
    if (!draft) return
    save({ ...draft, status: draft.status === 'active' ? 'paused' : 'active' })
  }

  function enrollPeople(personIds: string[]) {
    enrollPeopleInCampaign(personIds, campaignId)
  }

  return {
    draft, campaignId, accounts, companies,
    activeTab, setActiveTab,
    showAddLeads, setShowAddLeads,
    audienceCount, senderCount, previewLead, previewStep,
    generatingStep, previewStepIdx, setPreviewStepIdx,
    save, updateStep, removeStep, addStep, handleAiWrite, toggleStatus,
    enrollPeople, removePersonFromCampaign,
  }
}
