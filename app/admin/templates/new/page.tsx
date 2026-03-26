import type { Metadata } from 'next'
import { TemplateForm } from '@/components/admin/TemplateForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Nouveau template — Admin' }

export default function NewTemplatePage() {
  return (
    <div className="p-6">
      <Link
        href="/admin/templates"
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        Templates
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Nouveau template</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Créez un template pour l'ajouter au marketplace client.
        </p>
      </div>

      <TemplateForm mode="create" />
    </div>
  )
}
