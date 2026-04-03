import type { InboxMessage } from '@/types'

export const INBOX0: InboxMessage[] = [
  {
    id: 1,
    from: 'marcus@peakroofing.com',
    name: 'Marcus Chen',
    company: 'Peak Roofing Solutions',
    subject: "Re: Quick question about Peak Roofing Solutions's lead flow",
    preview: "Hey Shawn, appreciate the kind words about the hotel project. Yeah, we've been trying to figure out how to...",
    time: '10:42 AM',
    read: false,
    thread: [
      {
        from: 'shawn@radcoreai.com',
        body: "Hi Marcus,\n\nI came across Peak Roofing Solutions and was impressed by your presence in Austin, TX.\n\nCongrats on the Austin Business Journal feature — that downtown hotel project sounds like a major milestone for the team!\n\nI'm reaching out because we help roofing contractors build a predictable pipeline of qualified leads using AI-driven outreach — without the cost of a full sales team.\n\nWould it be worth a 15-minute call to see if it's a fit?\n\nBest,\nShawn",
        time: 'Mar 28, 9:15 AM',
      },
      {
        from: 'marcus@peakroofing.com',
        body: "Hey Shawn,\n\nAppreciate the kind words about the hotel project. Yeah, we've been trying to figure out how to scale up our commercial pipeline without just throwing money at Google Ads.\n\nWhat does your system actually look like? Is it just email blasting or something more targeted?\n\nMarcus",
        time: 'Mar 28, 10:42 AM',
      },
    ],
  },
  {
    id: 2,
    from: 'b.torres@summitshield.com',
    name: 'Brianna Torres',
    company: 'Summit Shield Roofing',
    subject: "Re: Quick question about Summit Shield Roofing's lead flow",
    preview: "Hi Shawn, the hail season timing was definitely intentional on our part. We've been gearing up for this for months...",
    time: 'Mar 26',
    read: true,
    thread: [
      {
        from: 'shawn@radcoreai.com',
        body: "Hi Brianna,\n\nI came across Summit Shield Roofing and was impressed by your work in Denver, CO.\n\nThe timing on your hail-restoration expansion looks perfect given what hit the Front Range this spring — smart move to get ahead of the claim surge.\n\nWe help roofing contractors systematically build relationships with both insurance adjusters and homeowners. Would love to share how.\n\nBest,\nShawn",
        time: 'Mar 25, 2:00 PM',
      },
      {
        from: 'b.torres@summitshield.com',
        body: "Hi Shawn,\n\nThe hail season timing was definitely intentional on our part. We've been gearing up for this for months.\n\nWe're actually in the middle of setting up a new CRM. Would it make sense to connect after that's in place, maybe in 3–4 weeks?\n\nBrianna",
        time: 'Mar 26, 11:18 AM',
      },
    ],
  },
]
