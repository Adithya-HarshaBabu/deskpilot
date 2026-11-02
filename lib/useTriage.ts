'use client'

import { useCallback, useState } from 'react'
import { triageAction } from '@/app/actions'
import { setTriaging, updateTicket } from './store'
import type { Ticket } from './triage'

/** Runs AI triage for tickets through the Server Action and writes the result into the inbox. */
export function useTriage() {
  const [error, setError] = useState<string | null>(null)

  const triage = useCallback(async (ticket: Ticket) => {
    setError(null)
    setTriaging(ticket.id, true)
    try {
      const result = await triageAction({ subject: ticket.subject, body: ticket.body, customer: ticket.customer })
      if (result.ok) updateTicket(ticket.id, { triage: result.triage, triagedLive: true })
      else setError(result.error)
      return result.ok
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      return false
    } finally {
      setTriaging(ticket.id, false)
    }
  }, [])

  /** Triage several tickets, two at a time, stopping at the first error. */
  const triageMany = useCallback(
    async (tickets: Ticket[]) => {
      const queue = [...tickets]
      let failed = false
      const worker = async () => {
        while (queue.length && !failed) {
          const ok = await triage(queue.shift()!)
          if (!ok) failed = true
        }
      }
      await Promise.all([worker(), worker()])
    },
    [triage],
  )

  return { triage, triageMany, error, clearError: () => setError(null) }
}
