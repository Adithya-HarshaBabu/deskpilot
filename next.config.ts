import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The Gemini SDK only ever runs on the server.
  serverExternalPackages: ['@google/genai'],
}

export default nextConfig
