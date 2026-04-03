import { AI_STEP_SUBJECTS, AI_STEP_BODIES } from '@/data/campaigns'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateCampaignStep(
  stepIndex: number,
  _totalSteps: number,
  _day: number
): Promise<{ subject: string; body: string }> {
  await delay(900 + Math.random() * 600)
  const idx = Math.min(stepIndex, AI_STEP_SUBJECTS.length - 1)
  return {
    subject: AI_STEP_SUBJECTS[idx],
    body: AI_STEP_BODIES[idx],
  }
}

export async function draftReply(senderName: string, lastMessage: string): Promise<string> {
  await delay(700 + Math.random() * 500)
  const firstName = senderName.split(' ')[0]
  return `Hi ${firstName},

Thanks for getting back to me — that\'s really helpful context.

${lastMessage.length > 50 ? 'Based on what you\'ve shared,' : 'To answer your question,'} I think we could definitely add value for your team. We\'ve worked with similar contractors and the results have been consistent.

Would a 15-minute call this week work to walk you through exactly how it works?

Best,
Shawn`
}
