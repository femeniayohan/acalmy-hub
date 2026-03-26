import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { CustomRequestForm } from '@/components/CustomRequestForm'

export const metadata: Metadata = { title: 'Demande sur mesure' }

export default async function CustomPage({ params }: { params: { slug: string } }) {
  auth().protect()

  return (
    <div className="p-4 sm:p-6 max-w-[600px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Demande sur mesure</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Décrivez votre besoin et notre équipe vous recontacte sous 24h.
        </p>
      </div>

      <div className="card p-6">
        <CustomRequestForm slug={params.slug} />
      </div>
    </div>
  )
}
