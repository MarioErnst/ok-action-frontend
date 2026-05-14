import { useEffect, useState } from 'react';
import { HttpAccentuationRepository } from '../../infrastructure/repositories/HttpAccentuationRepository';
import type { AccentuationWeakestPromptDto } from '../../infrastructure/dto/AccentuationDtos';

export type WeakestPromptsLoadState =
  | { status: 'loading' }
  | { status: 'ready'; rows: AccentuationWeakestPromptDto[] }
  | { status: 'error' };

// Loads /accentuation/insights/weakest-prompts. Kept as a hook so the
// presentational card stays a pure molecule that only renders; data
// lifecycle (loading, error, cleanup on unmount) belongs in the hook.
export default function useWeakestAccentuationPrompts(
  limit = 3,
  minPracticeCount = 1,
): WeakestPromptsLoadState {
  const [state, setState] = useState<WeakestPromptsLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    HttpAccentuationRepository.getWeakestPrompts(limit, minPracticeCount)
      .then((rows) => {
        if (cancelled) return;
        setState({ status: 'ready', rows });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [limit, minPracticeCount]);

  return state;
}
