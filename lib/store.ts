import { useSyncExternalStore } from 'react'
import { seedTickets } from './seed'
import type { Ticket } from './triage'

// Demo-mode data layer: each visitor gets their own inbox in localStorage, seeded on first visit.
// Swapping this module for server calls (e.g. Postgres via Server Actions) is the only change a
// real deployment needs; components only use the hooks and functions below.

const KEY = 'deskpilot:v1'

interface State {
  tickets: Ticket[]
  /** Tickets currently being triaged; in memory only. */
  triaging: ReadonlySet<string>
}

let state: State | null = null
const listeners = new Set<() => void>()

function load(): State {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return { tickets: JSON.parse(saved) as Ticket[], triaging: new Set() }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return { tickets: seedTickets(), triaging: new Set() }
}

function get(): State {
  state ??= load()
  return state
}

function set(next: State) {
  const persist = next.tickets !== state?.tickets
  state = next
  if (persist) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next.tickets))
    } catch {
      /* private mode: the demo still works for this visit */
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    state = load()
    listener()
  }
  addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    removeEventListener('storage', onStorage)
  }
}

/** Null during server rendering and hydration; the inbox lives in the browser. */
export function useStore(): State | null {
  return useSyncExternalStore(subscribe, get, () => null)
}

export function useTicket(id: string): Ticket | null | undefined {
  const s = useStore()
  return s === null ? undefined : (s.tickets.find((t) => t.id === id) ?? null)
}

export function updateTicket(id: string, patch: Partial<Ticket> | ((t: Ticket) => Partial<Ticket>)) {
  const s = get()
  set({
    ...s,
    tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)),
  })
}

export function addTicket(ticket: Ticket) {
  const s = get()
  set({ ...s, tickets: [ticket, ...s.tickets] })
}

export function setTriaging(id: string, on: boolean) {
  const s = get()
  const triaging = new Set(s.triaging)
  if (on) triaging.add(id)
  else triaging.delete(id)
  set({ ...s, triaging })
}

export function resetDemo() {
  set({ tickets: seedTickets(), triaging: new Set() })
}

export function nextTicketId(): string {
  const max = Math.max(1045, ...get().tickets.map((t) => Number(t.id.slice(2)) || 0))
  return `T-${max + 1}`
}
