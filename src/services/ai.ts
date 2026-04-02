function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const STEP_SUBJECTS = [
  'Quick question about {{company}}\'s lead flow',
  'Re: Quick question about {{company}}\'s lead flow',
  'One more thought for {{firstName}}',
  'Last note — {{company}}',
]

const STEP_BODIES = [
  `Hi {{firstName}},

I came across {{company}} and was really impressed by what you\'re building in {{city}}.

{{icebreaker}}

We help roofing contractors build a predictable pipeline of qualified leads using AI-driven outreach — without the cost of a full sales team.

Would it be worth a 15-minute call to see if it\'s a fit?

Best,
Shawn`,
  `Hi {{firstName}},

Just wanted to follow up on my last email. I know things get busy.

We\'ve helped similar roofing contractors in {{city}} add 10–20 qualified leads per month on autopilot.

Happy to share a quick case study if you\'re curious — no strings attached.

Best,
Shawn`,
  `Hi {{firstName}},

Quick thought: contractors in {{city}} are heading into peak season. Is your pipeline ready to handle the volume?

We can have a system running for {{company}} in under a week.

Worth a quick chat?

Shawn`,
  `Hi {{firstName}},

I\'ll keep this short — this is my last email so I don\'t clog your inbox.

If generating more qualified roofing leads ever becomes a priority, I\'d love to chat. Just reply "interested" and I\'ll set something up.

Either way, best of luck with {{company}}!

Shawn`,
]

export async function generateCampaignStep(
  stepIndex: number,
  _totalSteps: number,
  _day: number
): Promise<{ subject: string; body: string }> {
  await delay(900 + Math.random() * 600)
  const idx = Math.min(stepIndex, STEP_SUBJECTS.length - 1)
  return {
    subject: STEP_SUBJECTS[idx],
    body: STEP_BODIES[idx],
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
