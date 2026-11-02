// Demo-mode session: a signed cookie, no database. Uses Web Crypto so the same code runs in
// proxy.ts, Server Actions and Route Handlers.

export const SESSION_COOKIE = 'dp_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export interface Session {
  sub: string
  name: string
  iat: number
}

const encoder = new TextEncoder()

async function secret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  // No dedicated secret configured: derive one from the API key so deploys still work with a
  // single env var. Without either, fall back to a development-only value.
  if (process.env.GEMINI_API_KEY) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`deskpilot-session:${process.env.GEMINI_API_KEY}`))
    return toBase64Url(new Uint8Array(digest))
  }
  return 'deskpilot-development-only'
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

async function key() {
  return crypto.subtle.importKey('raw', encoder.encode(await secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signSession(session: Session): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)))
  const sig = await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromBase64Url(sig), encoder.encode(payload))
    if (!ok) return null
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session
    if (Date.now() / 1000 - session.iat > SESSION_MAX_AGE) return null
    return session
  } catch {
    return null
  }
}
