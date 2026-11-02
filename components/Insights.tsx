'use client'

import { useStore } from '@/lib/store'
import { CATEGORIES, PRIORITIES, SENTIMENTS, SLA_HOURS, TEAMS, type Ticket } from '@/lib/triage'
import { useNow } from '@/lib/time'

const PRIORITY_COLOR = { urgent: 'bg-red-500', high: 'bg-orange-500', normal: 'bg-sky-500', low: 'bg-zinc-400' }
const SENTIMENT_COLOR = { angry: 'bg-red-500', frustrated: 'bg-orange-400', neutral: 'bg-zinc-400', positive: 'bg-emerald-500' }

export default function Insights() {
  const store = useStore()
  const now = useNow()
  if (!store) return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-xl bg-panel-2" aria-busy />

  const triaged = store.tickets.filter((t): t is Ticket & { triage: NonNullable<Ticket['triage']> } => !!t.triage)
  const open = triaged.filter((t) => t.status === 'open')
  const breached = open.filter((t) => t.createdAt + SLA_HOURS[t.triage.priority] * 3_600_000 < now).length
  const count = <K extends string>(keys: readonly K[], pick: (t: (typeof triaged)[number]) => K) =>
    keys.map((k) => [k, triaged.filter((t) => pick(t) === k).length] as const)
  const negative = triaged.filter((t) => t.triage.sentiment === 'angry' || t.triage.sentiment === 'frustrated').length

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-muted">Across {triaged.length} triaged tickets in this inbox.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open tickets" value={open.length} />
        <Stat label="Urgent and open" value={open.filter((t) => t.triage.priority === 'urgent').length} tone="text-red-600 dark:text-red-400" />
        <Stat label="SLA breached" value={breached} tone={breached ? 'text-orange-600 dark:text-orange-400' : undefined} />
        <Stat label="Negative sentiment" value={`${triaged.length ? Math.round((negative / triaged.length) * 100) : 0}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Tickets by category">
          <Bars rows={count(CATEGORIES, (t) => t.triage.category).sort((a, b) => b[1] - a[1])} />
        </Card>
        <Card title="Tickets by team">
          <Bars rows={count(TEAMS, (t) => t.triage.team).sort((a, b) => b[1] - a[1])} />
        </Card>
        <Card title="Priority mix">
          <Stacked rows={count(PRIORITIES, (t) => t.triage.priority)} colors={PRIORITY_COLOR} />
        </Card>
        <Card title="Customer sentiment">
          <Stacked rows={count(SENTIMENTS, (t) => t.triage.sentiment)} colors={SENTIMENT_COLOR} />
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-panel p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Bars({ rows }: { rows: (readonly [string, number])[] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return (
    <ul className="grid gap-2">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[130px_1fr_28px] items-center gap-3 text-sm">
          <span className="truncate text-muted">{label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-panel-2">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}

function Stacked({ rows, colors }: { rows: (readonly [string, number])[]; colors: Record<string, string> }) {
  const total = Math.max(1, rows.reduce((s, [, n]) => s + n, 0))
  return (
    <div className="grid gap-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-panel-2" role="img" aria-label={rows.map(([k, n]) => `${k}: ${n}`).join(', ')}>
        {rows.map(([k, n]) => n > 0 && <span key={k} className={colors[k]} style={{ width: `${(n / total) * 100}%` }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, n]) => (
          <li key={k} className="flex items-center gap-1.5 capitalize">
            <span className={`size-2.5 rounded-full ${colors[k]}`} aria-hidden />
            {k} <span className="text-muted tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
