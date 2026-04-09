'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CustomRequestForm } from '@/components/CustomRequestForm'

interface Props {
  slug: string
  hasExisting: boolean
}

export function NewRequestToggle({ slug, hasExisting }: Props) {
  const [open, setOpen] = useState(!hasExisting)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] border border-dashed border-[rgba(0,0,0,0.15)] text-sm text-[rgba(0,0,0,0.4)] hover:border-[rgba(0,0,0,0.25)] hover:text-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.02)] transition-colors"
      >
        <Plus size={15} />
        Nouvelle demande
      </button>
    )
  }

  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(0,0,0,0.35)]">
          Nouvelle demande
        </p>
        {hasExisting && (
          <button
            onClick={() => setOpen(false)}
            className="text-[rgba(0,0,0,0.3)] hover:text-[rgba(0,0,0,0.6)] transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <CustomRequestForm slug={slug} onSuccess={() => setOpen(false)} />
    </div>
  )
}
