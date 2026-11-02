import Link from 'next/link'
import { Logo } from '@/components/AppShell'
import { currentSession } from '@/lib/auth'
import { startDemo } from './actions'

const FEATURES = [
  ['🏷️', 'Triage in seconds', 'Gemini reads each ticket and returns category, priority, sentiment, owning team, tags and a one-line summary, validated against a strict schema.'],
  ['⏱️', 'SLA-aware inbox', 'Tickets sort by priority and time left to first response. Breaches and near-misses stand out before a customer has to chase.'],
  ['✍️', 'Replies that stream in', 'Drafts arrive token by token, grounded in the help center and citing the articles they rely on, so policy is never made up.'],
  ['🌍', 'Any language', 'German, Spanish or English: triage works the same, and the language is detected so the right agent can pick it up.'],
  ['📊', 'Insights', 'Volume by category, priority mix and customer sentiment across the inbox, updated as tickets come in.'],
  ['🔒', 'Key stays on the server', 'AI runs in Server Actions and a streaming Route Handler behind a signed session, with per-user rate limits.'],
]

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, session] = await Promise.all([searchParams, currentSession()])
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <header className="flex items-center justify-between py-5">
        <span className="flex items-center gap-2 font-bold">
          <Logo /> Deskpilot
        </span>
        <a href="https://github.com/Adithya-HarshaBabu/deskpilot" className="text-sm font-medium text-muted hover:text-ink">
          Source on GitHub
        </a>
      </header>

      <section className="grid gap-6 py-14 md:py-20">
        <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-ink">Next.js 16 · Gemini · demo</span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
          Your support inbox, <span className="text-brand">triaged before you open it.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Deskpilot reads every incoming ticket, works out what it’s about and how urgent it really is, routes it to the
          right team and drafts a reply grounded in your help center. Try it on a realistic inbox for a fictional SaaS.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {session ? (
            <Link href="/app" className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90">
              Open your inbox →
            </Link>
          ) : (
            <form action={startDemo}>
              <input type="hidden" name="next" value={next ?? ''} />
              <button type="submit" className="cursor-pointer rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90">
                Try the live demo →
              </button>
            </form>
          )}
          <span className="text-sm text-muted">No sign-up. Your demo inbox stays in your browser.</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Features">
        {FEATURES.map(([icon, title, text]) => (
          <article key={title} className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-2 text-2xl" aria-hidden>{icon}</div>
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-sm text-muted">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 grid gap-3 rounded-2xl border border-line bg-panel p-6 md:grid-cols-[1fr_2fr]">
        <h2 className="text-lg font-semibold">How it’s built</h2>
        <ul className="grid gap-2 text-sm text-muted">
          <li><strong className="text-ink">App Router:</strong> server-rendered landing page, client inbox, route protection in <code>proxy.ts</code>.</li>
          <li><strong className="text-ink">Server Actions:</strong> demo sign-in with an HMAC-signed cookie, and triage calls with Gemini structured output validated by Zod, with retries and model fallback.</li>
          <li><strong className="text-ink">Streaming Route Handler:</strong> reply drafts stream token by token via a <code>ReadableStream</code>.</li>
          <li><strong className="text-ink">Demo-mode data:</strong> each visitor gets a seeded inbox in local storage, behind a small store API that a database could replace.</li>
        </ul>
      </section>
    </div>
  )
}
