import type { Campaign } from '@/types'

export const CAMPAIGNS0: Campaign[] = [
  {
    id: 1,
    name: 'Roofing Owners Q2 Outreach',
    status: 'active',
    fromEmail: 'shawn@radcoreai.com',
    leads: 48,
    sent: 31,
    opens: 18,
    replies: 4,
    steps: [
      {
        id: 1,
        day: 0,
        subject: "Quick question about {{company}}'s lead flow",
        body: "Hi {{firstName}},\n\nI came across {{company}} and was impressed by your presence in {{city}}.\n\n{{icebreaker}}\n\nI'm reaching out because we help roofing contractors build a predictable pipeline of qualified leads using AI-driven outreach — without the cost of a full sales team.\n\nWould it be worth a 15-minute call to see if it's a fit?\n\nBest,\nShawn",
      },
      {
        id: 2,
        day: 3,
        subject: "Re: Quick question about {{company}}'s lead flow",
        body: "Hi {{firstName}},\n\nJust wanted to follow up on my last email. I know things get busy.\n\nWe've helped similar roofing contractors in {{city}} add 10–20 qualified leads per month on autopilot.\n\nHappy to share a quick case study if you're curious.\n\nBest,\nShawn",
      },
      {
        id: 3,
        day: 7,
        subject: 'Last note — {{company}}',
        body: "Hi {{firstName}},\n\nI'll keep this short — this is my last email so I don't clog your inbox.\n\nIf generating more roofing leads ever becomes a priority, I'd love to chat. Just reply \"interested\" and I'll set something up.\n\nEither way, best of luck with {{company}}!\n\nShawn",
      },
    ],
  },
  {
    id: 2,
    name: 'Storm Season Blitz',
    status: 'draft',
    fromEmail: 'outreach@radleads.io',
    leads: 0,
    sent: 0,
    opens: 0,
    replies: 0,
    steps: [
      {
        id: 1,
        day: 0,
        subject: 'Storm season leads for {{company}}',
        body: "Hi {{firstName}},\n\nStorm season is here and homeowners are actively searching for roofers in {{city}}.\n\nWe help contractors like you capture that demand systematically.\n\nGot 15 minutes this week?\n\nShawn",
      },
    ],
  },
]

export const AI_STEP_SUBJECTS = [
  "Quick question about {{company}}'s lead flow",
  "Re: Quick question about {{company}}'s lead flow",
  'One more thought for {{firstName}}',
  'Last note — {{company}}',
]

export const AI_STEP_BODIES = [
  `Hi {{firstName}},

I came across {{company}} and was really impressed by what you're building in {{city}}.

{{icebreaker}}

We help roofing contractors build a predictable pipeline of qualified leads using AI-driven outreach — without the cost of a full sales team.

Would it be worth a 15-minute call to see if it's a fit?

Best,
Shawn`,
  `Hi {{firstName}},

Just wanted to follow up on my last email. I know things get busy.

We've helped similar roofing contractors in {{city}} add 10–20 qualified leads per month on autopilot.

Happy to share a quick case study if you're curious — no strings attached.

Best,
Shawn`,
  `Hi {{firstName}},

Quick thought: contractors in {{city}} are heading into peak season. Is your pipeline ready to handle the volume?

We can have a system running for {{company}} in under a week.

Worth a quick chat?

Shawn`,
  `Hi {{firstName}},

I'll keep this short — this is my last email so I don't clog your inbox.

If generating more qualified roofing leads ever becomes a priority, I'd love to chat. Just reply "interested" and I'll set something up.

Either way, best of luck with {{company}}!

Shawn`,
]

export const TOKEN_HINTS = ['{{firstName}}', '{{lastName}}', '{{company}}', '{{city}}', '{{icebreaker}}']
