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
