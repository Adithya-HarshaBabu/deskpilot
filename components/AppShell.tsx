'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions'
import { resetDemo, useStore } from '@/lib/store'

const NAV = [
  { href: '/app', label: 'Inbox', icon: '📥' },
  { href: '/app/new', label: 'New ticket', icon: '✍️' },
  { href: '/app/insights', label: 'Insights', icon: '📊' },
]

export default function AppShell({ agentName, children }: { agentName: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const store = useStore()
  const open = store?.tickets.filter((t) => t.status === 'open').length
  const isActive = (href: string) => (href === '/app' ? pathname === '/app' || pathname.startsWith('/app/tickets') : pathname.startsWith(href))

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-panel/90 px-4 py-3 backdrop-blur md:h-dvh md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-3 md:py-5">
        <Link href="/" className="mr-auto flex items-center gap-2 px-2 font-bold md:mr-0 md:mb-5">
          <Logo /> Deskpilot
        </Link>
        <nav className="flex gap-1 md:flex-col" aria-label="App">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-panel-2 hover:text-ink aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-ink"
            >
              <span aria-hidden className="hidden md:inline">{item.icon}</span>
              {item.label}
              {item.href === '/app' && open !== undefined && (
                <span className="ml-auto hidden rounded-full bg-panel-2 px-1.5 text-xs tabular-nums md:inline">{open}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden md:mt-auto md:grid md:gap-2 md:px-2 md:text-xs md:text-muted">
          <p>
            Signed in as <strong className="text-ink">{agentName}</strong>
            <br />
            demo agent · data stays in this browser
          </p>
          <div className="flex gap-3">
            <button type="button" className="underline-offset-2 hover:text-ink hover:underline" onClick={() => confirm('Reset the inbox to the original demo tickets?') && resetDemo()}>
              Reset demo
            </button>
            <form action={signOut}>
              <button type="submit" className="underline-offset-2 hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path d="M8 11h16M8 16h10M8 21h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23" cy="21" r="3" fill="#fff" />
    </svg>
  )
}
