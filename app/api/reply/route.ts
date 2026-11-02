import { AiError, checkRateLimit, streamReply, validateTicket } from '@/lib/ai'
import { currentSession } from '@/lib/auth'
import { TONES, TriageSchema, type Tone } from '@/lib/triage'

export const maxDuration = 60

// POST /api/reply → the reply draft as a plain-text stream, token by token.
export async function POST(request: Request) {
  const session = await currentSession()
  if (!session) return Response.json({ error: 'Start the demo first.' }, { status: 401 })

  const input = (await request.json().catch(() => null)) as { ticket?: unknown; triage?: unknown; tone?: unknown } | null
  let ticket
  try {
    checkRateLimit(session.sub)
    ticket = validateTicket(input?.ticket)
  } catch (error) {
    const e = error instanceof AiError ? error : new AiError('Bad request.', 400)
    return Response.json({ error: e.message }, { status: e.status })
  }
  const triage = TriageSchema.safeParse(input?.triage).data
  const tone: Tone = TONES.includes(input?.tone as Tone) ? (input!.tone as Tone) : 'friendly'

  const chunks = streamReply(ticket, triage, tone, session.name)
  // Pull the first chunk before answering, so setup errors become a proper status code instead
  // of a stream that dies immediately.
  let first: IteratorResult<string>
  try {
    first = await chunks.next()
  } catch (error) {
    const e = error instanceof AiError ? error : new AiError('Something went wrong. Try again.', 500)
    return Response.json({ error: e.message }, { status: e.status })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (!first.done) controller.enqueue(encoder.encode(first.value))
    },
    async pull(controller) {
      try {
        const { value, done } = await chunks.next()
        if (done) controller.close()
        else controller.enqueue(encoder.encode(value))
      } catch (error) {
        controller.error(error)
      }
    },
    cancel() {
      void chunks.return(undefined)
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
