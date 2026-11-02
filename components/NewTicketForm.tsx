'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EXAMPLES } from '@/lib/seed'
import { addTicket, nextTicketId } from '@/lib/store'
import { MAX_TICKET_CHARS, PLANS, type Customer, type Ticket } from '@/lib/triage'
import { useTriage } from '@/lib/useTriage'

const EMPTY: Customer = { name: '', email: '', plan: 'Pro' }

export default function NewTicketForm() {
  const router = useRouter()
  const { triage } = useTriage()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [customer, setCustomer] = useState<Customer>(EMPTY)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = Date.now()
    const ticket: Ticket = {
      id: nextTicketId(),
      subject: subject.trim(),
      body: body.trim(),
      customer: { ...customer, name: customer.name.trim() || 'Demo customer', email: customer.email.trim() || 'customer@example.com' },
      createdAt: now,
      status: 'open',
      thread: [{ from: 'customer', body: body.trim(), at: now }],
    }
    addTicket(ticket)
    // Triage runs in the background; the ticket page shows it arriving.
    void triage(ticket)
    router.push(`/app/tickets/${ticket.id}`)
  }

  const field = 'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm'

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="text-2xl font-bold">New ticket</h1>
        <p className="text-sm text-muted">Write as a customer would, in any language. Gemini triages it as soon as it lands.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => {
              setSubject(ex.subject)
              setBody(ex.body)
              setCustomer(ex.customer)
            }}
            className="cursor-pointer rounded-full border border-line bg-panel px-3 py-1 hover:border-brand"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-panel p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-medium">
            Customer name
            <input className={field} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Jamie Lee" maxLength={80} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input className={field} type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="jamie@company.com" maxLength={120} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Plan
            <select className={field} value={customer.plan} onChange={(e) => setCustomer({ ...customer, plan: e.target.value as Customer['plan'] })}>
              {PLANS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Subject
          <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={160} placeholder="What’s going on?" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Message
          <textarea className={field} value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={MAX_TICKET_CHARS} rows={7} placeholder="Describe the problem…" />
          <span className="justify-self-end text-xs font-normal text-muted tabular-nums">{body.length} / {MAX_TICKET_CHARS}</span>
        </label>
        <button type="submit" className="cursor-pointer justify-self-start rounded-full bg-brand px-5 py-2 font-semibold text-white hover:opacity-90">
          Submit and triage →
        </button>
      </form>
    </div>
  )
}
