import type { ReactNode } from 'react'

type Props = {
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  children: ReactNode
}

const TONES = {
  good: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  warn: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  bad: 'border-red-400/40 bg-red-400/10 text-red-300',
  neutral: 'border-border bg-surface-alt text-text-muted',
}

export function BodyStatusPill({ tone, children }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  )
}
