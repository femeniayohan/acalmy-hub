import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
}

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: 'w-full max-w-sm',
          card: 'shadow-none border border-[rgba(0,0,0,0.08)] rounded-[12px]',
          headerTitle: 'font-semibold text-[#0a0a0a]',
          headerSubtitle: 'text-[rgba(0,0,0,0.5)]',
          formButtonPrimary:
            'bg-[#0a0a0a] hover:bg-[#1a1a1a] text-sm font-medium rounded-[8px]',
          formFieldInput:
            'border-[rgba(0,0,0,0.12)] rounded-[8px] text-sm focus:border-[rgba(0,0,0,0.3)]',
          footerActionLink: 'text-[#0a0a0a] font-medium hover:text-[rgba(0,0,0,0.7)]',
        },
      }}
    />
  )
}
