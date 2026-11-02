'use client'

import { SLA_HOURS, type Priority, type Sentiment, type Ticket } from '@/lib/triage'

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900',
  high: 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900',
  normal: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900',
  low: 'bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${PRIORITY_STYLE[priority]}`}>
      {priority}
    </span>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-panel-2 px-1.5 py-0.5 text-xs text-muted">{children}</span>
}

const SENTIMENT: Record<Sentiment, [emoji: string, label: string]> = {
  angry: ['😠', 'Angry'],
  frustrated: ['😣', 'Frustrated'],
  neutral: ['😐', 'Neutral'],
  positive: ['🙂', 'Positive'],
}

export function SentimentLabel({ sentiment, compact }: { sentiment: Sentiment; compact?: boolean }) {
  const [emoji, label] = SENTIMENT[sentiment]
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" title={`Sentiment: ${label}`}>
      <span aria-hidden>{emoji}</span>
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  )
}

function duration(ms: number) {
  const m = Math.round(Math.abs(ms) / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}

/** Time left to first response, based on the triaged priority. */
export function SlaTimer({ ticket, now }: { ticket: Ticket; now: number }) {
  if (!ticket.triage || ticket.status !== 'open') return null
  const left = ticket.createdAt + SLA_HOURS[ticket.triage.priority] * 3_600_000 - now
  const breached = left < 0
  const tight = !breached && left < 30 * 60_000
  return (
    <span
      className={`text-xs font-medium tabular-nums ${breached ? 'text-red-600 dark:text-red-400' : tight ? 'text-orange-600 dark:text-orange-400' : 'text-muted'}`}
      title="Time to first response"
    >
      {breached ? `SLA breached ${duration(left)} ago` : `Reply within ${duration(left)}`}
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px] ${className}`}
    />
  )
}
