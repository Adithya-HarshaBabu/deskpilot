import 'server-only'
import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { kbForPrompt } from './kb'
import { MAX_TICKET_CHARS, TriageSchema, triageJsonSchema, type Customer, type Tone, type Triage } from './triage'

// All Gemini calls live here, on the server. The browser never sees the key.

// Flash-Lite is fast and good at schema-constrained work; Flash is the backup when Lite is
// overloaded or its answer fails validation.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const FALLBACK_MODEL = 'gemini-3.8-flash'
const ATTEMPT_TIMEOUT_MS = 18_000

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

let client: GoogleGenAI | null = null
function ai(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AiError('AI is not configured on this server (GEMINI_API_KEY is missing).', 503)
  client ??= new GoogleGenAI({ apiKey })
  return client
}

// Best-effort abuse protection for a public demo: per-user limits held in memory per instance.
const hits = new Map<string, number[]>()
export function checkRateLimit(user: string, perMinute = 12, perHour = 80) {
  const now = Date.now()
  const recent = (hits.get(user) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.filter((t) => now - t < 60_000).length >= perMinute || recent.length >= perHour) {
    throw new AiError('You’re going a bit fast for the demo. Try again in a minute.', 429)
  }
  hits.set(user, [...recent, now])
}

const TRIAGE_PROMPT = `You triage support tickets for Orbit, a project-management SaaS.
Classify each ticket exactly as the schema asks. Judge priority from impact, not tone: an angry
how-to question is still low or normal; a calm report that nobody can log in is urgent.
Enterprise customers blocked from working are at least high. Never invent facts.`

export interface TicketInput {
  subject: string
  body: string
  customer: Customer
}

function ticketText(t: TicketInput) {
  return `From: ${t.customer.name} <${t.customer.email}> (plan: ${t.customer.plan})\nSubject: ${t.subject}\n\n${t.body}`
}

export function validateTicket(input: unknown): TicketInput {
  const t = input as Partial<TicketInput> | null
  const subject = typeof t?.subject === 'string' ? t.subject.trim() : ''
  const body = typeof t?.body === 'string' ? t.body.trim() : ''
  if (subject.length < 3 || body.length < 10) throw new AiError('Add a subject and a few words describing the problem.', 400)
  if (subject.length > 160 || body.length > MAX_TICKET_CHARS) throw new AiError(`Keep the ticket under ${MAX_TICKET_CHARS} characters.`, 400)
  const c = t?.customer
  const customer: Customer = {
    name: typeof c?.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 80) : 'Customer',
    email: typeof c?.email === 'string' ? c.email.trim().slice(0, 120) : '',
    plan: c?.plan === 'Pro' || c?.plan === 'Enterprise' ? c.plan : 'Free',
  }
  return { subject, body, customer }
}

function classify(error: unknown): 'fatal' | 'thinking' | 'retry' {
  const message = error instanceof Error ? error.message : String(error)
  if (/thinking/i.test(message)) return 'thinking'
  if (/API key|PERMISSION_DENIED|RESOURCE_EXHAUSTED|quota|\b40[03]\b/i.test(message)) return 'fatal'
  return 'retry'
}

export async function triageTicket(ticket: TicketInput): Promise<Triage> {
  let feedback = ''
  let busy = false
  let thinking = true
  for (let attempt = 0; attempt < 3; attempt++) {
    const model = busy || feedback ? FALLBACK_MODEL : process.env.GEMINI_MODEL || DEFAULT_MODEL
    try {
      const response = await ai().models.generateContent({
        model,
        contents: feedback ? `${ticketText(ticket)}\n\nYour previous answer was invalid: ${feedback}. Fix it.` : ticketText(ticket),
        config: {
          systemInstruction: TRIAGE_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: triageJsonSchema,
          temperature: 0.1,
          maxOutputTokens: 1024,
          ...(thinking && { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      })
      const parsed = TriageSchema.safeParse(JSON.parse(response.text ?? ''))
      if (parsed.success) return { ...parsed.data, tags: parsed.data.tags.map((t) => t.toLowerCase()) }
      feedback = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 400)
      busy = false
    } catch (error) {
      if (error instanceof SyntaxError) {
        feedback = 'the response was not valid JSON'
        continue
      }
      const kind = classify(error)
      console.error(`[deskpilot] triage attempt ${attempt + 1} (${model}) failed:`, String(error).slice(0, 400))
      if (kind === 'thinking' && thinking) {
        thinking = false
        attempt--
        continue
      }
      if (kind === 'fatal') throw new AiError('The AI service rejected the request. Check the server’s Gemini key and quota.', 502)
      busy = true
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw busy ? new AiError('Gemini is busy right now. Try again in a moment.', 503) : new AiError('The AI could not produce a valid triage. Try again.', 502)
}

const TONE_GUIDE: Record<Tone, string> = {
  friendly: 'Warm and human, first names, short paragraphs.',
  formal: 'Professional and precise, no exclamation marks.',
  concise: 'Three to five sentences, straight to the fix.',
}

/** Streams a reply draft, grounded in the help-center articles. */
export async function* streamReply(ticket: TicketInput, triage: Triage | undefined, tone: Tone, agentName: string) {
  const system = `You are ${agentName}, a support agent at Orbit. Draft a reply to the customer.
Use only facts from these help-center articles; cite the ones you rely on as (KB-xxx). If they don't
cover the problem, say what you'll check and when you'll follow up, and never promise refunds or
fixes the articles don't support. Acknowledge the customer's frustration if they show any.
Tone: ${TONE_GUIDE[tone]} Plain text only, no markdown headings. Sign off as ${agentName}.

Articles:
${kbForPrompt()}`
  const context = triage ? `\n\nInternal triage (do not quote): ${triage.category}, ${triage.priority} priority. ${triage.summary}` : ''
  const models = [process.env.GEMINI_MODEL || DEFAULT_MODEL, FALLBACK_MODEL]
  let sent = false
  for (const [i, model] of models.entries()) {
    try {
      const stream = await ai().models.generateContentStream({
        model,
        contents: ticketText(ticket) + context,
        config: {
          systemInstruction: system,
          temperature: 0.5,
          maxOutputTokens: 900,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(30_000),
        },
      })
      for await (const chunk of stream) {
        if (!chunk.text) continue
        sent = true
        yield chunk.text
      }
      return
    } catch (error) {
      console.error(`[deskpilot] reply (${model}) failed:`, String(error).slice(0, 400))
      // Part of the draft is already on screen; starting over with another model would repeat it.
      if (sent) throw new AiError('The draft was cut off. Try again.', 503)
      if (classify(error) === 'fatal') throw new AiError('The AI service rejected the request. Check the server’s Gemini key and quota.', 502)
      if (i === models.length - 1) throw new AiError('Gemini is busy right now. Try again in a moment.', 503)
    }
  }
}
