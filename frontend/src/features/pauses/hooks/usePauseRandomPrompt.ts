import { useEffect, useState } from 'react';
import { HttpPauseRepository } from '../infrastructure/repositories/HttpPauseRepository';
import type { PausePrompt } from '../types';

export type PauseRandomPromptState =
  | { status: 'loading' }
  | { status: 'ready'; prompt: PausePrompt }
  | { status: 'error'; message: string };

// Loads one random pauses prompt from the catalog. Kept as a hook so the
// page stays a thin shell that only branches on state. The cleanup flag
// avoids state updates after unmount when the request resolves late.
export default function usePauseRandomPrompt(): PauseRandomPromptState {
  const [state, setState] = useState<PauseRandomPromptState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    HttpPauseRepository.getRandomPrompt()
      .then((dto) => {
        if (cancelled) return;
        setState({ status: 'ready', prompt: { id: dto.id, text: dto.text } });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la consigna. Reintenta más tarde.';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
