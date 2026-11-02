// Help-center articles for Orbit, the fictional project-management SaaS the demo inbox supports.
// Reply drafts are grounded in these, so the model quotes real policy instead of inventing it.

export interface Article {
  id: string
  title: string
  body: string
}

export const ARTICLES: Article[] = [
  {
    id: 'KB-101',
    title: 'Refunds and plan changes',
    body: 'Annual plans can be refunded in full within 30 days of purchase. Monthly plans are not refunded, but downgrades take effect at the end of the billing period. Duplicate charges are always refunded within 5–7 business days.',
  },
  {
    id: 'KB-102',
    title: 'Invoices, VAT and receipts',
    body: 'Invoices are under Settings → Billing → Invoices. Company name, address and VAT ID can be edited there and apply to future invoices; support can reissue past invoices on request.',
  },
  {
    id: 'KB-201',
    title: 'Resetting a password or 2FA',
    body: 'Use “Forgot password” on the sign-in page. If two-factor authentication is lost, an owner on the same workspace can reset it under Members, or support can after verifying identity by email from the account address.',
  },
  {
    id: 'KB-202',
    title: 'Single sign-on (SAML)',
    body: 'SSO is available on Enterprise. Configure it under Settings → Security → SSO with your IdP metadata URL. When SSO is enforced, password sign-in is disabled except for workspace owners.',
  },
  {
    id: 'KB-301',
    title: 'Status page and incidents',
    body: 'Live service status is at status.orbit.example. During an incident, updates are posted at least every 30 minutes. Enterprise customers receive a written incident report within 5 business days.',
  },
  {
    id: 'KB-302',
    title: 'API rate limits',
    body: 'The REST API allows 600 requests per minute per workspace on Pro and 3,000 on Enterprise. Responses include X-RateLimit-Remaining; 429 responses include Retry-After.',
  },
  {
    id: 'KB-401',
    title: 'Importing from other tools',
    body: 'Projects can be imported from CSV, Trello, Asana and Jira under Settings → Import. Imports keep assignees by matching email addresses; attachments over 25 MB are skipped.',
  },
  {
    id: 'KB-402',
    title: 'Recurring tasks and automations',
    body: 'Recurring tasks are set from a task’s ⋯ menu → Repeat. Automations (Pro and above) run on triggers such as status changes and can assign, move or notify.',
  },
  {
    id: 'KB-501',
    title: 'Data export and deletion',
    body: 'Owners can export all workspace data as JSON or CSV under Settings → Data. Deleted projects stay in Trash for 30 days and can be restored by an owner; after that, deletion is permanent.',
  },
  {
    id: 'KB-601',
    title: 'Plans and pricing',
    body: 'Free: up to 3 projects and 5 members. Pro: $12 per member per month, unlimited projects, automations. Enterprise: SSO, audit log, 99.9% uptime SLA and a named success manager.',
  },
]

export function kbForPrompt(): string {
  return ARTICLES.map((a) => `[${a.id}] ${a.title}: ${a.body}`).join('\n')
}
