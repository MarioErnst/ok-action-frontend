import { useEffect, useState } from 'react'
import { HttpPronunciationRepository } from '../../infrastructure/repositories/HttpPronunciationRepository'
import type { PronunciationWeakestPromptDto } from '../../infrastructure/dto/PronunciationDtos'
import type { PronunciationLevel } from '../../domain/PronunciationSession'

export type WeakestPromptsLoadState =
  | { status: 'loading' }
  | { status: 'ready'; rows: PronunciationWeakestPromptDto[] }
  | { status: 'error' }

// Loads /pronunciation/insights/weakest-prompts. Kept as a hook so the
// presentational card stays a pure molecule that only renders; data
// lifecycle (loading, error, cleanup on unmount) belongs in the hook.
export default function useWeakestPronunciationPrompts(
  limit = 3,
  minPracticeCount = 1,
  level?: PronunciationLevel,
): WeakestPromptsLoadState {
  const [state, setState] = useState<WeakestPromptsLoadState>({ status: 'loading' })

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

  return state
}
