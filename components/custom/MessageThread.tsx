'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, Send } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  author_role: string
  author_name: string | null
  created_at: string
}

interface Props {
  messages: Message[]
  postUrl: string
  currentRole: 'client' | 'admin'
}

export function MessageThread({ messages: initial, postUrl, currentRole }: Props) {
  const [messages, setMessages] = useState(initial)
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || isSending) return
    setIsSending(true)
    setError(null)

    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setMessages(prev => [...prev, data.message])
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? (
        <p className="text-sm text-[rgba(0,0,0,0.35)] text-center py-4">
          Aucun message pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map(msg => {
            const isOwn = msg.author_role === currentRole
            return (
              <div key={msg.id} className={cn('flex gap-2.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold',
                  msg.author_role === 'admin'
                    ? 'bg-[#1a1208] text-white'
                    : 'bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.5)]'
                )}>
                  {msg.author_role === 'admin' ? 'A' : (msg.author_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                  <div className={cn(
                    'px-3 py-2 rounded-[12px] text-sm leading-relaxed',
                    isOwn
                      ? 'bg-[#1a1208] text-white rounded-tr-[4px]'
                      : 'bg-[rgba(0,0,0,0.05)] text-[#0a0a0a] rounded-tl-[4px]'
                  )}>
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-[rgba(0,0,0,0.3)] px-1">
                    {msg.author_name ?? (msg.author_role === 'admin' ? 'Acalmy' : 'Vous')}
                    {' · '}{formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 mt-1">
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Écrire un message…"
          className="input-base flex-1 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isSending || !content.trim()}
          className="btn-primary px-3 py-2 shrink-0"
        >
          {isSending
            ? <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />}
        </button>
      </form>
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  )
}
