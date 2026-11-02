import { z } from 'zod'

// Shared by the server (Gemini structured output + validation) and the client (types, labels).

export const CATEGORIES = ['Billing', 'Bug', 'Outage', 'Account access', 'Feature request', 'How-to'] as const
export const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const
export const SENTIMENTS = ['angry', 'frustrated', 'neutral', 'positive'] as const
export const TEAMS = ['Billing', 'Engineering', 'Customer Success', 'Product'] as const
export const PLANS = ['Free', 'Pro', 'Enterprise'] as const
export const TONES = ['friendly', 'formal', 'concise'] as const

export type Category = (typeof CATEGORIES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type Sentiment = (typeof SENTIMENTS)[number]
export type Team = (typeof TEAMS)[number]
export type Plan = (typeof PLANS)[number]
export type Tone = (typeof TONES)[number]

export const TriageSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES).describe('urgent: outage, data loss, security or many users blocked. high: one customer blocked or money at stake. normal: degraded or confusing. low: questions and ideas.'),
  sentiment: z.enum(SENTIMENTS),
  team: z.enum(TEAMS).describe('Team that should own the ticket'),
  summary: z.string().min(10).max(220).describe('One sentence an agent can read in two seconds'),
  reasoning: z.string().min(10).max(240).describe('Why this priority, citing the customer’s words or plan'),
  tags: z.array(z.string().min(2).max(24)).max(4).describe('Short lowercase tags, e.g. "invoice", "sso", "api"'),
  language: z.string().min(2).max(24).describe('Language the customer wrote in, in English, e.g. "English", "Spanish"'),
})

export type Triage = z.infer<typeof TriageSchema>

export const triageJsonSchema = (() => {
  // Gemini's JSON-schema support doesn't need the $schema marker zod adds.
  const { $schema: _ignored, ...schema } = z.toJSONSchema(TriageSchema) as Record<string, unknown>
  return schema
})()

export interface Customer {
  name: string
  email: string
  plan: Plan
}

export interface Message {
  from: 'customer' | 'agent'
  body: string
  at: number
}

export interface Ticket {
  id: string
  subject: string
  body: string
  customer: Customer
  createdAt: number
  status: 'open' | 'pending' | 'resolved'
  triage?: Triage
  /** Set when the triage came from the model in this browser, not the seed data. */
  triagedLive?: boolean
  thread: Message[]
}

/** Hours to first response by priority. */
export const SLA_HOURS: Record<Priority, number> = { urgent: 1, high: 4, normal: 24, low: 72 }

export const MAX_TICKET_CHARS = 2000
