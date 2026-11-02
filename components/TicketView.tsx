'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { updateTicket, useStore, useTicket } from '@/lib/store'
import { PRIORITIES, TEAMS, TONES, type Priority, type Team, type Ticket, type Tone } from '@/lib/triage'
import { useTriage } from '@/lib/useTriage'
import { PriorityBadge, SentimentLabel, SlaTimer, Spinner, Tag } from './badges'
import { timeAgo, useNow } from '@/lib/time'
import { ErrorNote } from './Inbox'

export default function TicketView({ id }: { id: string }) {
  const ticket = useTicket(id)
  const store = useStore()
  const now = useNow()

  if (ticket === undefined) return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-xl bg-panel-2" aria-busy />
  if (ticket === null) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-xl font-bold">Ticket {id} isn’t in this inbox</h1>
        <p className="mt-2 text-muted">It may have been removed when the demo was reset.</p>
        <Link href="/app" className="mt-4 inline-block font-semibold text-brand">← Back to inbox</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <div className="grid gap-2">
        <Link href="/app" className="w-fit text-sm text-muted hover:text-ink">← Inbox</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {ticket.id} · {ticket.customer.name} &lt;{ticket.customer.email}&gt; · {ticket.customer.plan} · {timeAgo(ticket.createdAt, now)}
            </p>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          </div>
          <StatusSwitch ticket={ticket} />
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 gap-4">
          <Thread ticket={ticket} now={now} />
          <Composer ticket={ticket} />
        </div>
        <TriagePanel ticket={ticket} now={now} triaging={store?.triaging.has(ticket.id) ?? false} />
      </div>
    </div>
  )
}

function StatusSwitch({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-0.5 text-sm" role="radiogroup" aria-label="Status">
      {(['open', 'pending', 'resolved'] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={ticket.status === s}
          onClick={() => updateTicket(ticket.id, { status: s })}
          className="cursor-pointer rounded-md px-3 py-1 capitalize text-muted aria-checked:bg-panel-2 aria-checked:font-semibold aria-checked:text-ink"
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function Thread({ ticket, now }: { ticket: Ticket; now: number }) {
  return (
    <ol className="grid gap-3" aria-label="Conversation">
      {ticket.thread.map((m, i) => (
        <li
          key={i}
          className={`rounded-xl border p-4 ${m.from === 'agent' ? 'ml-6 border-brand/30 bg-brand-soft' : 'mr-6 border-line bg-panel'}`}
        >
          <p className="mb-1.5 text-xs font-semibold text-muted">
            {m.from === 'agent' ? 'You replied' : ticket.customer.name} · {timeAgo(m.at, now)}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
        </li>
      ))}
    </ol>
  )
}

function Composer({ ticket }: { ticket: Ticket }) {
  const [draft, setDraft] = useState('')
  const [tone, setTone] = useState<Tone>('friendly')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const generate = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setDraft('')
    setStreaming(true)
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: { subject: ticket.subject, body: ticket.body, customer: ticket.customer }, triage: ticket.triage, tone }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        setDraft((d) => d + value)
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error && e.message !== 'network error' ? e.message : 'The draft was interrupted. Try again.')
    } finally {
      if (abortRef.current === controller) setStreaming(false)
    }
  }

  const send = () => {
    updateTicket(ticket.id, (t) => ({ thread: [...t.thread, { from: 'agent', body: draft.trim(), at: Date.now() }], status: 'pending' }))
    setDraft('')
  }

  return (
    <section className="grid gap-3 rounded-xl border border-line bg-panel p-4" aria-label="Reply">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Reply</h2>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="rounded-md border border-line bg-panel px-1.5 py-1 capitalize text-ink" disabled={streaming}>
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {streaming ? (
          <button type="button" onClick={() => { abortRef.current?.abort(); setStreaming(false) }} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm font-semibold">
            ■ Stop
          </button>
        ) : (
          <button type="button" onClick={() => void generate()} className="cursor-pointer rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
            ✨ {draft ? 'Redraft' : 'Draft with AI'}
          </button>
        )}
      </div>
      {error && <ErrorNote message={error} onClose={() => setError(null)} />}
      {streaming ? (
        <div className="min-h-48 whitespace-pre-wrap rounded-lg border border-brand/40 bg-bg p-3 text-sm leading-relaxed" aria-live="polite">
          <span className="streaming-caret">{draft}</span>
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={9}
          placeholder="Write a reply, or let the AI draft one from the help center…"
          aria-label="Reply text"
          className="min-h-48 w-full rounded-lg border border-line bg-bg p-3 text-sm leading-relaxed"
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Drafts cite help-center articles as (KB-…). Review before sending.</p>
        <button type="button" onClick={send} disabled={!draft.trim() || streaming} className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-40">
          Send reply
        </button>
      </div>
    </section>
  )
}

function TriagePanel({ ticket, now, triaging }: { ticket: Ticket; now: number; triaging: boolean }) {
  const { triage: run, error, clearError } = useTriage()
  const t = ticket.triage

  const override = (patch: { priority?: Priority; team?: Team }) => t && updateTicket(ticket.id, { triage: { ...t, ...patch } })

  return (
    <aside className="grid gap-4 rounded-xl border border-line bg-panel p-4 lg:sticky lg:top-6" aria-label="AI triage">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">AI triage</h2>
        <button
          type="button"
          onClick={() => void run(ticket)}
          disabled={triaging}
          className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-panel-2 disabled:cursor-wait disabled:opacity-60"
        >
          {triaging ? <><Spinner /> Triaging…</> : t ? 'Re-run' : '✨ Triage now'}
        </button>
      </div>
      {error && <ErrorNote message={error} onClose={clearError} />}
      {!t ? (
        <p className="text-sm text-muted">{triaging ? 'Gemini is reading the ticket…' : 'This ticket hasn’t been triaged yet.'}</p>
      ) : (
        <div className={`grid gap-4 transition-opacity ${triaging ? 'opacity-50' : ''}`}>
          <p className="text-sm leading-relaxed">{t.summary}</p>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-muted">Priority</dt>
            <dd className="flex items-center gap-2">
              <PriorityBadge priority={t.priority} />
              <select aria-label="Override priority" value={t.priority} onChange={(e) => override({ priority: e.target.value as Priority })} className="rounded-md border border-line bg-panel px-1 py-0.5 text-xs capitalize text-muted">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </dd>
            <dt className="text-muted">SLA</dt>
            <dd><SlaTimer ticket={ticket} now={now} /> {ticket.status !== 'open' && <span className="text-xs text-muted">Responded</span>}</dd>
            <dt className="text-muted">Category</dt>
            <dd>{t.category}</dd>
            <dt className="text-muted">Team</dt>
            <dd>
              <select aria-label="Assign team" value={t.team} onChange={(e) => override({ team: e.target.value as Team })} className="rounded-md border border-line bg-panel px-1.5 py-0.5">
                {TEAMS.map((team) => <option key={team}>{team}</option>)}
              </select>
            </dd>
            <dt className="text-muted">Sentiment</dt>
            <dd><SentimentLabel sentiment={t.sentiment} /></dd>
            <dt className="text-muted">Language</dt>
            <dd>{t.language}</dd>
          </dl>
          {t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
            </div>
          )}
          <div className="rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-muted">
            <span className="font-semibold text-ink">Why this priority: </span>
            {t.reasoning}
          </div>
          <p className="text-xs text-muted">
            {ticket.triagedLive ? '✨ Triaged live by Gemini in this browser.' : 'Pre-triaged demo data. Press Re-run to triage it live.'}
          </p>
        </div>
      )}
    </aside>
  )
}
