import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { currentSession } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects visitors without a session; this keeps the layout safe on its own.
  const session = await currentSession()
  if (!session) redirect('/')
  return <AppShell agentName={session.name}>{children}</AppShell>
}
