import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s — Acalmy',
    default: 'Acalmy Hub',
  },
  description: 'Votre espace de gestion des automatisations IA.',
  robots: { index: false, follow: false }, // Hub is private — don't index
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html
        lang="fr"
        className={`${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning
      >
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
