import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from './lib/session'

// Optimistic gate: no session, no inbox or AI endpoints. Server Actions and the reply route check
// the session again themselves, since this only runs on matched paths.
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Start the demo first.' }, { status: 401 })
  }
  const url = new URL('/', request.url)
  url.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/app/:path*', '/api/:path*'],
}
