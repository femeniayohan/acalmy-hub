import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatEur, formatDate } from '@/lib/utils'
import { Package, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Templates — Admin' }

export default async function AdminTemplatesPage() {
  const supabase = createServiceClient()

  const { data: templates } = await supabase
    .from('marketplace_templates')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">Templates marketplace</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {templates?.length ?? 0} template{(templates?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/templates/new" className="btn-primary gap-1.5 text-sm">
          <Plus size={14} />
          Nouveau template
        </Link>
      </div>

      {!templates?.length ? (
        <div className="card p-10 text-center">
          <Package size={24} className="mx-auto mb-2 text-[rgba(0,0,0,0.2)]" />
          <p className="text-sm text-[rgba(0,0,0,0.4)]">Aucun template configuré.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {['Template', 'Catégorie', 'Prix/mois', 'Stripe Price ID', 'Statut', 'Créé', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-[#fafaf9]">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#0a0a0a]">{t.name}</p>
                    <p className="text-xs text-[rgba(0,0,0,0.35)] line-clamp-1 max-w-[200px]">
                      {t.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[rgba(0,0,0,0.5)]">{t.category}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-[#0a0a0a]">
                    {formatEur(t.price_monthly)}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[11px] font-mono text-[rgba(0,0,0,0.4)]">
                      {t.stripe_price_id ?? '—'}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-[9999px] ${
                      t.is_active
                        ? 'bg-[#dcfce7] text-[#16a34a]'
                        : 'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.4)]'
                    }`}>
                      {t.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[rgba(0,0,0,0.4)]">
                    {formatDate(t.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/templates/${t.id}/edit`}
                      className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors"
                    >
                      Modifier →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
