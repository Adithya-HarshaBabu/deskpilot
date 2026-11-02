'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AiError, checkRateLimit, triageTicket, validateTicket } from '@/lib/ai'
import { currentSession } from '@/lib/auth'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/session'
import type { Triage } from '@/lib/triage'

const AGENT_NAMES = ['Alex', 'Jordan', 'Sam', 'Robin', 'Taylor', 'Casey', 'Morgan', 'Riley']

export async function startDemo(formData: FormData) {
  const name = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]
  const token = await signSession({ sub: `demo-${crypto.randomUUID()}`, name, iat: Math.floor(Date.now() / 1000) })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  const next = formData.get('next')
  redirect(typeof next === 'string' && next.startsWith('/app') ? next : '/app')
}

export async function signOut() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/')
}

export type TriageResult = { ok: true; triage: Triage } | { ok: false; error: string }

export async function triageAction(input: unknown): Promise<TriageResult> {
  const session = await currentSession()
  if (!session) return { ok: false, error: 'Your demo session expired. Reload to start again.' }
  try {
    checkRateLimit(session.sub)
    return { ok: true, triage: await triageTicket(validateTicket(input)) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message }
    console.error('[deskpilot] triage failed:', error)
    return { ok: false, error: 'Something went wrong. Try again.' }
  }
}
