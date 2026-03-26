import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { TemplateForm } from '@/components/admin/TemplateForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Modifier le template — Admin' }

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: template } = await supabase
    .from('marketplace_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!template) notFound()

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
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Modifier — {template.name}</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Les modifications sont appliquées immédiatement pour les nouvelles souscriptions.
        </p>
      </div>

      <TemplateForm mode="edit" template={template} />
    </div>
  )
}
