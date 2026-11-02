import type { Customer, Ticket, Triage } from './triage'

// The demo inbox. Times are minutes before "now" so SLAs always look current. Most tickets arrive
// pre-triaged (as they would after the pipeline ran); the last three are new and wait for the AI.

type Seed = [id: string, minutesAgo: number, customer: Customer, subject: string, body: string, triage?: Triage]

const c = (name: string, email: string, plan: Customer['plan']): Customer => ({ name, email, plan })

const SEEDS: Seed[] = [
  [
    'T-1042', 18, c('Hannah Weiss', 'hannah@northwind.example', 'Enterprise'),
    'Nobody on our team can log in since 9am',
    'Since about 9am CET none of our 140 users can sign in. SSO redirects back to the login page in a loop. This is blocking our whole delivery team, we have a client deadline today. Please treat as urgent.',
    { category: 'Outage', priority: 'urgent', sentiment: 'frustrated', team: 'Engineering', summary: 'SSO sign-in loop has locked out all 140 users of an Enterprise workspace since 9am.', reasoning: 'Entire Enterprise workspace blocked with a same-day client deadline.', tags: ['sso', 'login', 'outage'], language: 'English' },
  ],
  [
    'T-1041', 34, c('Marco Bianchi', 'marco@studio-bianchi.example', 'Pro'),
    'Charged twice this month??',
    'I was charged $96 twice on the 1st. I only have one workspace. This is the second time this year. Fix it and refund me or I am cancelling.',
    { category: 'Billing', priority: 'high', sentiment: 'angry', team: 'Billing', summary: 'Pro customer was double-charged $96 on the 1st, second time this year, and threatens to cancel.', reasoning: 'Money taken in error plus explicit churn risk.', tags: ['refund', 'duplicate-charge', 'churn-risk'], language: 'English' },
  ],
  [
    'T-1040', 52, c('Priya Raman', 'priya@lattice.example', 'Enterprise'),
    'API returning 429 at low volume',
    'Our sync job started getting 429 Too Many Requests at roughly 200 requests/minute, well under the 3,000 limit in our contract. Started after your deploy yesterday. Headers show X-RateLimit-Remaining: 0 immediately.',
    { category: 'Bug', priority: 'high', sentiment: 'neutral', team: 'Engineering', summary: 'Enterprise API calls hit 429 at ~200 req/min, far below their 3,000 limit, since yesterday’s deploy.', reasoning: 'Possible regression throttling an Enterprise integration below contracted limits.', tags: ['api', 'rate-limit', 'regression'], language: 'English' },
  ],
  [
    'T-1039', 75, c('Lucía Fernández', 'lucia@cafe-lumen.example', 'Free'),
    'No puedo restablecer mi contraseña',
    'Hola, pedí restablecer mi contraseña tres veces pero el correo nunca llega. Ya revisé la carpeta de spam. ¿Me pueden ayudar?',
    { category: 'Account access', priority: 'normal', sentiment: 'frustrated', team: 'Customer Success', summary: 'Password reset emails never arrive after three attempts; spam folder already checked.', reasoning: 'Single Free user locked out; inconvenient but not widespread.', tags: ['password', 'email'], language: 'Spanish' },
  ],
  [
    'T-1038', 110, c('Tom Becker', 'tom@becker-builds.example', 'Pro'),
    'Recurring tasks created twice',
    'Every Monday our recurring “Weekly standup notes” task shows up twice. Started two weeks ago. Not a huge deal but it confuses the team.',
    { category: 'Bug', priority: 'normal', sentiment: 'neutral', team: 'Engineering', summary: 'Weekly recurring task is duplicated every Monday for the past two weeks.', reasoning: 'Annoying data bug with a workaround; no one is blocked.', tags: ['recurring-tasks', 'duplicates'], language: 'English' },
  ],
  [
    'T-1037', 140, c('Aisha Okafor', 'aisha@greenfield.example', 'Enterprise'),
    'Need incident report for Tuesday outage',
    'Our security team needs the formal incident report for Tuesday’s 40-minute outage for our quarterly vendor review. When can we expect it?',
    { category: 'Outage', priority: 'normal', sentiment: 'neutral', team: 'Customer Success', summary: 'Enterprise customer requests the written incident report for Tuesday’s 40-minute outage.', reasoning: 'Contractual Enterprise request with a deadline, but nothing is broken now.', tags: ['incident-report', 'compliance'], language: 'English' },
  ],
  [
    'T-1036', 185, c('Jonas Lindqvist', 'jonas@fjord.example', 'Pro'),
    'Gantt view please!',
    'Love Orbit, honestly. The one thing we miss from our old tool is a Gantt / timeline view with dependencies. Any plans? Would happily beta test.',
    { category: 'Feature request', priority: 'low', sentiment: 'positive', team: 'Product', summary: 'Happy Pro customer asks for a Gantt/timeline view with dependencies and offers to beta test.', reasoning: 'Feature idea from a satisfied customer; no impact on current work.', tags: ['gantt', 'timeline', 'beta'], language: 'English' },
  ],
  [
    'T-1035', 240, c('Mei Tanaka', 'mei@kumo.example', 'Pro'),
    'How do I import from Jira?',
    'We are moving from Jira. Is there a way to bring our projects over, including who is assigned to what?',
    { category: 'How-to', priority: 'low', sentiment: 'neutral', team: 'Customer Success', summary: 'Customer migrating from Jira asks how to import projects with assignees.', reasoning: 'Documented how-to question; nothing is broken.', tags: ['import', 'jira', 'migration'], language: 'English' },
  ],
  [
    'T-1034', 300, c('David Cohen', 'david@cohen-legal.example', 'Enterprise'),
    'Project deleted by mistake, need it back NOW',
    'A junior colleague deleted our “Case 2291 - Discovery” project yesterday. It has six months of work. Please tell me this can be restored.',
    { category: 'Account access', priority: 'urgent', sentiment: 'frustrated', team: 'Customer Success', summary: 'Enterprise customer needs a deleted project with six months of work restored.', reasoning: 'Potential data loss for an Enterprise account; the 30-day restore window is time-sensitive.', tags: ['restore', 'deleted-project', 'data'], language: 'English' },
  ],
  [
    'T-1033', 360, c('Sofia Rossi', 'sofia@rossi-design.example', 'Free'),
    'Is SSO available on the free plan?',
    'Hi! We are a small studio evaluating Orbit. Our IT person asked if we can use Google SSO on the free plan.',
    { category: 'How-to', priority: 'low', sentiment: 'positive', team: 'Customer Success', summary: 'Prospect on Free asks whether SSO is available on their plan.', reasoning: 'Pre-sales question with no urgency.', tags: ['sso', 'pricing', 'presales'], language: 'English' },
  ],
  [
    'T-1032', 420, c('Ravi Iyer', 'ravi@ledgerline.example', 'Pro'),
    'VAT number missing on invoices',
    'Our accountant needs our VAT ID on the last three invoices. I added it in settings today but the old invoices still don’t show it.',
    { category: 'Billing', priority: 'normal', sentiment: 'neutral', team: 'Billing', summary: 'Customer needs the last three invoices reissued with their newly added VAT ID.', reasoning: 'Accounting request with a clear fix; no service impact.', tags: ['invoice', 'vat'], language: 'English' },
  ],
  [
    'T-1031', 510, c('Emma Brown', 'emma@brightpath.example', 'Pro'),
    'Automations stopped firing',
    'Our “move to Review when PR merged” automation hasn’t run since Friday. Nothing changed on our side. The automation log shows nothing at all.',
    { category: 'Bug', priority: 'high', sentiment: 'frustrated', team: 'Engineering', summary: 'An automation has silently stopped running since Friday with an empty log.', reasoning: 'Core workflow broken for several days with no visible error.', tags: ['automations', 'webhooks'], language: 'English' },
  ],
  [
    'T-1030', 640, c('Kai Nakamura', 'kai@tidepool.example', 'Free'),
    'Thanks for the quick fix yesterday',
    'Just wanted to say thanks to Leo for sorting out our board permissions so fast yesterday. Great support!',
    { category: 'How-to', priority: 'low', sentiment: 'positive', team: 'Customer Success', summary: 'Customer thanks the team for a fast fix to board permissions.', reasoning: 'Positive feedback; no action needed beyond a thank-you.', tags: ['feedback', 'kudos'], language: 'English' },
  ],
  [
    'T-1029', 780, c('Ines Dubois', 'ines@atelier-dubois.example', 'Pro'),
    'Downgrade to Free at end of month',
    'We are a smaller team now. Can we move to the free plan at the end of this billing period without losing our projects? We have 4 active projects.',
    { category: 'Billing', priority: 'normal', sentiment: 'neutral', team: 'Billing', summary: 'Customer wants to downgrade to Free at period end but has 4 projects, over the Free limit of 3.', reasoning: 'Churn-adjacent billing change; needs a clear answer about the project limit.', tags: ['downgrade', 'plan-limits'], language: 'English' },
  ],
  [
    'T-1028', 900, c('Omar Haddad', 'omar@sandline.example', 'Enterprise'),
    'Audit log export for SOC 2',
    'Our auditors need a full export of the audit log for the past 12 months. What’s the fastest way to get it?',
    { category: 'How-to', priority: 'normal', sentiment: 'neutral', team: 'Customer Success', summary: 'Enterprise customer needs a 12-month audit log export for a SOC 2 audit.', reasoning: 'Compliance deadline likely, but not blocking daily work.', tags: ['audit-log', 'export', 'compliance'], language: 'English' },
  ],
  [
    'T-1027', 1100, c('Nora Larsen', 'nora@polar.example', 'Pro'),
    'Mobile app crashes on attachments',
    'The iOS app crashes every time I open a PDF attachment in a task. iPhone 15, latest app version. Desktop is fine.',
    { category: 'Bug', priority: 'normal', sentiment: 'frustrated', team: 'Engineering', summary: 'iOS app crashes when opening PDF attachments; desktop works.', reasoning: 'Reproducible crash with a desktop workaround.', tags: ['ios', 'crash', 'attachments'], language: 'English' },
  ],
  [
    'T-1026', 1300, c('Diego Reyes', 'diego@reyes-co.example', 'Free'),
    'this is useless',
    'cant figure out how to make a task repeat. why is this so hard. every other app has this',
    { category: 'How-to', priority: 'low', sentiment: 'angry', team: 'Customer Success', summary: 'Frustrated Free user can’t find how to make a task repeat.', reasoning: 'Angry tone, but it’s a documented how-to with no outage.', tags: ['recurring-tasks', 'onboarding'], language: 'English' },
  ],
  [
    'T-1025', 1500, c('Leila Haddad', 'leila@meridian.example', 'Enterprise'),
    'Dashboard loading very slowly',
    'For the past hour the main dashboard takes 30+ seconds to load for our whole EU team. US colleagues say it’s fine.',
    { category: 'Outage', priority: 'urgent', sentiment: 'frustrated', team: 'Engineering', summary: 'Dashboard takes 30+ seconds for an entire EU Enterprise team; US unaffected.', reasoning: 'Regional degradation affecting a whole Enterprise team.', tags: ['performance', 'eu', 'latency'], language: 'English' },
  ],
  [
    'T-1024', 1700, c('Ana Silva', 'ana@silvaworks.example', 'Pro'),
    'Add colleague as admin',
    'How do I give my colleague admin rights so she can manage billing too?',
    { category: 'How-to', priority: 'low', sentiment: 'neutral', team: 'Customer Success', summary: 'Customer asks how to make a colleague an admin who can manage billing.', reasoning: 'Simple permissions question.', tags: ['permissions', 'admin'], language: 'English' },
  ],
  // New tickets the AI hasn't seen yet.
  [
    'T-1045', 3, c('Grace Kim', 'grace@harbor-health.example', 'Enterprise'),
    'Exported CSV contains other customers’ data',
    'We just exported our workspace to CSV and the file contains about 40 rows with project names and emails that are definitely not ours. This looks like a serious data leak. We have stopped all exports on our side.',
  ],
  [
    'T-1044', 7, c('Lucas Müller', 'lucas@kranich.example', 'Pro'),
    'Rechnung doppelt bezahlt',
    'Hallo, wir haben die Rechnung für Oktober versehentlich zweimal per Überweisung bezahlt (je 144 €). Können Sie uns den doppelten Betrag zurückerstatten oder gutschreiben?',
  ],
  [
    'T-1043', 12, c('Zara Patel', 'zara@nimbus.example', 'Free'),
    'Dark mode?',
    'Would love a dark mode for late-night planning sessions. Is that on the roadmap?',
  ],
]

export function seedTickets(now = Date.now()): Ticket[] {
  return SEEDS.map(([id, minutesAgo, customer, subject, body, triage]) => ({
    id,
    subject,
    body,
    customer,
    createdAt: now - minutesAgo * 60_000,
    status: 'open',
    triage,
    thread: [{ from: 'customer', body, at: now - minutesAgo * 60_000 }],
  }))
}

/** One-click examples on the New ticket form. */
export const EXAMPLES: { label: string; subject: string; body: string; customer: Customer }[] = [
  {
    label: 'Locked out',
    subject: 'Can’t access my account after phone change',
    body: 'I got a new phone and lost my authenticator app. Now I can’t log in and I have a presentation from Orbit in an hour. I’m the only owner of the workspace.',
    customer: c('Sam Rivera', 'sam@rivera.example', 'Pro'),
  },
  {
    label: 'Refund request',
    subject: 'Refund for annual plan',
    body: 'We bought the annual Pro plan 12 days ago but our company is switching tools. Can we get a refund?',
    customer: c('Elif Demir', 'elif@demir.example', 'Pro'),
  },
  {
    label: 'Calm but urgent',
    subject: 'Tasks not saving',
    body: 'Hi, small heads-up: since this morning none of our edits to tasks are saving. They revert after refresh. It affects everyone in our workspace (35 people). Thanks for looking.',
    customer: c('Ben Carter', 'ben@carter-labs.example', 'Enterprise'),
  },
]
