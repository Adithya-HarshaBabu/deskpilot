import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Deskpilot: AI support ticket triage', template: '%s · Deskpilot' },
  description:
    'A support inbox where Gemini triages every ticket (category, priority, sentiment, owner) and drafts grounded replies that stream in live. Built with Next.js.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-[15px]">{children}</body>
    </html>
  )
}
