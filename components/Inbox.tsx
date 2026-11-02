'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { CATEGORIES, PRIORITIES, SLA_HOURS, type Category, type Priority, type Ticket } from '@/lib/triage'
import { useTriage } from '@/lib/useTriage'
import { PriorityBadge, SentimentLabel, SlaTimer, Spinner, Tag } from './badges'
import { timeAgo, useNow } from '@/lib/time'

type StatusFilter = 'open' | 'pending' | 'resolved' | 'all'

const RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

/** Untriaged first (they need a look), then by priority, then by SLA deadline. */
function compare(a: Ticket, b: Ticket) {
  if (!a.triage || !b.triage) return a.triage ? 1 : b.triage ? -1 : b.createdAt - a.createdAt
  const byRank = RANK[a.triage.priority] - RANK[b.triage.priority]
  if (byRank) return byRank
  const due = (t: Ticket) => t.createdAt + SLA_HOURS[t.triage!.priority] * 3_600_000
  return due(a) - due(b)
}

export default function Inbox() {
  const store = useStore()
  const now = useNow()
  const { triageMany, error, clearError } = useTriage()
  const [status, setStatus] = useState<StatusFilter>('open')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')

  const tickets = store?.tickets
  const visible = useMemo(() => {
    if (!tickets) return []
    const q = query.trim().toLowerCase()
    return tickets
      .filter((t) => status === 'all' || t.status === status)
      .filter((t) => priority === 'all' || t.triage?.priority === priority)
      .filter((t) => category === 'all' || t.triage?.category === category)
      .filter((t) => !q || `${t.id} ${t.subject} ${t.body} ${t.customer.name} ${t.customer.email}`.toLowerCase().includes(q))
      .sort(compare)
  }, [tickets, status, priority, category, query])

  if (!store) return <InboxSkeleton />

  const untriaged = store.tickets.filter((t) => !t.triage && !store.triaging.has(t.id))
  const counts = { open: 0, pending: 0, resolved: 0, all: store.tickets.length }
  for (const t of store.tickets) counts[t.status]++

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted">Sorted by priority and time left to first response.</p>
        </div>
        <Link href="/app/new" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          + New ticket
        </Link>
      </div>

      {(untriaged.length > 0 || store.triaging.size > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm">
          {store.triaging.size > 0 ? (
            <span className="flex items-center gap-2 font-medium text-brand-ink">
              <Spinner /> Triaging {store.triaging.size + untriaged.length} ticket{store.triaging.size + untriaged.length === 1 ? '' : 's'} with Gemini…
            </span>
          ) : (
            <>
              <span className="font-medium text-brand-ink">
                {untriaged.length} new ticket{untriaged.length === 1 ? '' : 's'} waiting for triage
              </span>
              <button
                type="button"
                onClick={() => void triageMany(untriaged)}
                className="ml-auto cursor-pointer rounded-full bg-brand px-4 py-1.5 font-semibold text-white hover:opacity-90"
              >
                ✨ Triage all with AI
              </button>
            </>
          )}
        </div>
      )}
      {error && <ErrorNote message={error} onClose={clearError} />}

      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-line bg-panel p-0.5 text-sm" role="tablist" aria-label="Status">
          {(['open', 'pending', 'resolved', 'all'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className="cursor-pointer rounded-md px-3 py-1 capitalize text-muted aria-selected:bg-panel-2 aria-selected:font-semibold aria-selected:text-ink"
            >
              {s} <span className="tabular-nums opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
        <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'all')} className="rounded-lg border border-line bg-panel px-2 text-sm">
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as Category | 'all')} className="rounded-lg border border-line bg-panel px-2 text-sm">
          <option value="all">Any category</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets"
          aria-label="Search tickets"
          className="min-w-0 flex-1 basis-48 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm"
        />
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {visible.length === 0 && <li className="p-8 text-center text-sm text-muted">No tickets match these filters.</li>}
        {visible.map((t) => (
          <li key={t.id}>
            <TicketRow ticket={t} now={now} triaging={store.triaging.has(t.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TicketRow({ ticket: t, now, triaging }: { ticket: Ticket; now: number; triaging: boolean }) {
  return (
    <Link href={`/app/tickets/${t.id}`} className="grid gap-1.5 px-4 py-3 hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none sm:grid-cols-[1fr_auto] sm:gap-x-4">
      <div className="flex min-w-0 items-center gap-2">
        {t.triage ? (
          <PriorityBadge priority={t.triage.priority} />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">
            {triaging ? <><Spinner /> Triaging</> : 'New'}
          </span>
        )}
        <span className="truncate font-semibold">{t.subject}</span>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <SlaTimer ticket={t} now={now} />
        {t.status !== 'open' && <span className="text-xs capitalize text-muted">{t.status}</span>}
        <span className="text-xs text-muted tabular-nums">{timeAgo(t.createdAt, now)}</span>
      </div>
      <p className="truncate text-sm text-muted">
        <span className="text-ink">{t.customer.name}</span>
        {t.customer.plan !== 'Free' && <span className="ml-1 text-xs">({t.customer.plan})</span>} · {t.triage?.summary ?? t.body}
      </p>
      {t.triage && (
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <Tag>{t.triage.category}</Tag>
          <Tag>→ {t.triage.team}</Tag>
          {t.triage.language !== 'English' && <Tag>{t.triage.language}</Tag>}
          <SentimentLabel sentiment={t.triage.sentiment} compact />
        </div>
      )}
    </Link>
  )
}

export function ErrorNote({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} className="cursor-pointer font-semibold" aria-label="Dismiss">✕</button>
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4" aria-busy>
      <div className="h-12 w-48 animate-pulse rounded-lg bg-panel-2" />
      <div className="h-[480px] animate-pulse rounded-xl border border-line bg-panel" />
    </div>
  )
}
