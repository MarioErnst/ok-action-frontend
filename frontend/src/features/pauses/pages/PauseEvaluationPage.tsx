import { useEffect, useState } from 'react';
import usePauseDetection from '../hooks/usePauseDetection';
import { HttpPauseRepository } from '../infrastructure/repositories/HttpPauseRepository';
import PauseRecordingScreen from '../components/organisms/PauseRecordingScreen';
import PauseResultsScreen from '../components/organisms/PauseResultsScreen';
import type { PausePrompt, PauseSessionResult } from '../types';

const PAUSE_SESSION_DURATION_MS = 20_000;

type PromptState =
  | { status: 'loading' }
  | { status: 'ready'; prompt: PausePrompt }
  | { status: 'error'; message: string };

export default function PauseEvaluationPage() {
  const [promptState, setPromptState] = useState<PromptState>({ status: 'loading' });
  const detection = usePauseDetection(PAUSE_SESSION_DURATION_MS);

  useEffect(() => {
    let cancelled = false;
    HttpPauseRepository.getRandomPrompt()
      .then((dto) => {
        if (cancelled) return;
        setPromptState({ status: 'ready', prompt: { id: dto.id, text: dto.text } });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la consigna. Reintenta más tarde.';
        setPromptState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (promptState.status === 'loading') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-bg text-text">
        <p className="text-sm text-text-muted">Cargando consigna...</p>
      </main>
    );
  }

  if (promptState.status === 'error') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-bg p-4 text-text">
        <p className="text-sm text-text-muted">{promptState.message}</p>
      </main>
    );
  }

  const prompt = promptState.prompt;
  const sessionResult: PauseSessionResult | null = detection.result
    ? {
        promptId: prompt.id,
        promptText: prompt.text,
        ...detection.result,
      }
    : null;

  if (sessionResult) {
    return <PauseResultsScreen result={sessionResult} onReset={detection.reset} />;
  }

  return (
    <PauseRecordingScreen
      promptText={prompt.text}
      phase={detection.phase}
      elapsedMs={detection.elapsedMs}
      durationMs={detection.durationMs}
      db={detection.db}
      noiseFloor={detection.noiseFloor}
      isSilent={detection.isSilent}
      currentMetrics={detection.currentMetrics}
      analyser={detection.analyser}
      onStart={() => {
        void detection.start(PAUSE_SESSION_DURATION_MS);
      }}
      onStop={() => {
        void detection.stop();
      }}
      onReset={detection.reset}
    />
  );
}
