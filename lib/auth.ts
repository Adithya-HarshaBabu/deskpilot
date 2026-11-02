import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession, type Session } from './session'

export async function currentSession(): Promise<Session | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}
