# Deskpilot

**Live demo: [deskpilot-two.vercel.app](https://deskpilot-two.vercel.app)**

**A support inbox where Gemini triages every ticket and drafts grounded replies that stream in live.**
Built with Next.js 16 (App Router). Runs in demo mode: one click to start, no sign-up, and each
visitor's inbox lives in their own browser.

## What it does
- **AI triage:** category, priority, sentiment, owning team, tags, language, a one-line summary and
  the reasoning behind the priority. Gemini structured output (JSON Schema from Zod), validated with
  Zod, retried with the validation error fed back, and falling back to a second model when overloaded
- **Judges impact, not tone:** a polite “small heads-up” that 35 people can’t save work is urgent;
  an angry how-to question isn’t
- **Streaming reply drafts:** grounded in a small help center, citing articles as (KB-…), with
  friendly, formal or concise tone; stoppable mid-stream; editable before sending
- **SLA-aware inbox:** sorted by priority and time left to first response, with breach warnings;
  batch “Triage all with AI” for new tickets, two at a time
- **Agent overrides** for priority and team, ticket status, and an insights page for volume,
  priority mix and sentiment
- Any language: tickets in German or Spanish are triaged the same, with the language detected

## How it's built
| Piece | Where |
|---|---|
| Route protection (redirects, 401 for APIs) | `proxy.ts` |
| Demo sign-in with an HMAC-signed, httpOnly cookie (Web Crypto) | `app/actions.ts`, `lib/session.ts` |
| Triage via a Server Action | `app/actions.ts` → `lib/ai.ts` |
| Streaming reply drafts via a Route Handler and `ReadableStream` | `app/api/reply/route.ts` |
| Gemini calls, retries, model fallback, per-user rate limits | `lib/ai.ts` (server-only) |
| Shared schema and types | `lib/triage.ts` |
| Demo-mode data: seeded inbox in localStorage behind a small store API | `lib/store.ts`, `lib/seed.ts` |

The Gemini key never reaches the browser. Swapping `lib/store.ts` for database calls (e.g. Postgres
through Server Actions) is the only change a multi-user deployment needs.

## Run locally
```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (https://aistudio.google.com/apikey) and SESSION_SECRET
npm run dev                  # http://localhost:5192
```

## Deploy
Import the repo into Vercel and set `GEMINI_API_KEY` and `SESSION_SECRET` (`openssl rand -hex 32`)
in the project's environment variables. `GEMINI_MODEL` optionally overrides the default
`gemini-3.5-flash-lite` (backup: `gemini-3.8-flash`).

Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Gemini (`@google/genai`), Zod.
