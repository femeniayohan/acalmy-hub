import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as euros using French locale.
 * Amounts are stored in centimes.
 */
export function formatEur(centimes: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimes / 100)
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`
}

/**
 * Format a relative time (e.g. "il y a 3 heures").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return "à l'instant"
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} jours`

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

/**
 * Format a date in French locale.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(d)
}

/**
 * Format a time in French locale.
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Estimate time saved in minutes based on execution data.
 * Rule of thumb: each automation run saves ~15 minutes of manual work.
 */
export function estimateTimeSaved(
  totalRuns: number,
  avgDurationMs: number
): { minutes: number; hours: number } {
  // Assume each automation run replaces 15 minutes of manual work
  const manualMinutesPerRun = 15
  const minutes = totalRuns * manualMinutesPerRun
  const hours = Math.round(minutes / 60)
  return { minutes, hours }
}

/**
 * Translate automation category to French.
 */
export function translateCategory(category: string): string {
  const map: Record<string, string> = {
    crm: 'CRM',
    marketing: 'Marketing',
    reporting: 'Reporting',
    ia: 'IA & Agents',
  }
  return map[category] ?? category
}

/**
 * Returns the first name from a full name string.
 */
export function firstName(name: string | null | undefined): string {
  if (!name) return ''
  return name.split(' ')[0]
}
