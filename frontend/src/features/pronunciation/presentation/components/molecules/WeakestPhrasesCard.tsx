import { useEffect, useState } from 'react'
import { HttpPronunciationRepository } from '../../../infrastructure/repositories/HttpPronunciationRepository'
import type { PronunciationWeakestPromptDto } from '../../../infrastructure/dto/PronunciationDtos'
import type { PronunciationLevel } from '../../../domain/PronunciationSession'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; rows: PronunciationWeakestPromptDto[] }
  | { status: 'error' }

interface WeakestPhrasesCardProps {
  limit?: number
  minPracticeCount?: number
  level?: PronunciationLevel
}

// Module documentation: documentacion/modulos/pronunciacion.md (section 6).
// Pulls /pronunciation/insights/weakest-prompts and renders the prompts where
// the user has the lowest historical avg score, optionally filtered by level.
// Hidden during cold start (no eligible history) to keep the entry clean.
export default function WeakestPhrasesCard({
  limit = 3,
  minPracticeCount = 1,
  level,
}: WeakestPhrasesCardProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    HttpPronunciationRepository.getWeakestPrompts(limit, minPracticeCount, level)
      .then((rows) => {
        if (cancelled) return
        setState({ status: 'ready', rows })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [limit, minPracticeCount, level])

  if (state.status === 'loading' || state.status === 'error' || state.rows.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/70 p-5 backdrop-blur-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-accent">
          Tus frases más difíciles
        </h2>
        <span className="text-xs text-text-muted">Promedio histórico</span>
      </header>
      <ul className="flex flex-col gap-2">
        {state.rows.map((row) => (
          <li
            key={row.prompt_id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-surface-alt/40 p-3"
          >
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-medium text-text">{row.text}</p>
              <p className="text-xs text-text-muted">
                {row.practice_count} {row.practice_count === 1 ? 'intento' : 'intentos'} · {row.difficulty}
              </p>
            </div>
            <span className="rounded-full bg-danger/15 px-3 py-1 text-sm font-bold text-danger">
              {row.avg_score}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
