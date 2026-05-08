import { useEffect, useRef, useState } from 'react';
import { HttpPauseRepository } from '../../infrastructure/repositories/HttpPauseRepository';
import { toSavePauseSessionDto } from '../../infrastructure/mappers/pauseMapper';
import PauseMetricsSummary from '../molecules/PauseMetricsSummary';
import PauseTimeline from '../molecules/PauseTimeline';
import type { PauseSessionResult } from '../../types';

interface PauseResultsScreenProps {
  result: PauseSessionResult;
  onReset: () => void;
}

function getFeedback(result: PauseSessionResult): string {
  switch (result.pauseMetrics.classification) {
    case 'pocas pausas':
      return 'Tu respuesta tuvo pocas pausas relevantes. No es necesariamente malo; si sientes que el mensaje sale acelerado, prueba marcar cierres de idea con pausas breves.';
    case 'demasiadas pausas':
      return 'Se detectaron pausas extensas o frecuentes. Si fueron intencionales, revisa que coincidan con cambios de idea; si no, practica unir mejor las frases clave.';
    case 'pausas adecuadas':
      return 'Tus pausas ayudan a ordenar el mensaje sin cortar demasiado el ritmo.';
  }
}

export default function PauseResultsScreen({ result, onReset }: PauseResultsScreenProps) {
  const savedRef = useRef(false);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    setSaveState('saving');
    HttpPauseRepository.saveSession(toSavePauseSessionDto(result))
      .then(() => setSaveState('saved'))
      .catch((error) => {
        setSaveState('error');
        console.error('Error saving pause session:', error);
      });
  }, [result]);

  return (
    <main className="min-h-screen bg-bg p-4 text-text md:p-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <header className="rounded-xl border border-border bg-surface p-5">
          <p className="m-0 text-sm text-text-muted">Resultado de pausas</p>
          <h1 className="m-0 mt-2 text-2xl font-bold text-text">Analisis completado</h1>
        </header>

        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wider text-text-muted">Pregunta</p>
          <p className="mt-3 text-base leading-relaxed text-text">{result.promptText}</p>
        </section>

        <PauseMetricsSummary metrics={result.pauseMetrics} />

        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wider text-text-muted">Feedback</p>
          <p className="mt-2 text-sm leading-relaxed text-text">{getFeedback(result)}</p>
        </section>

        <PauseTimeline pauses={result.pauseMetrics.pauses} durationMs={result.durationMs} />

        <p className="text-center text-xs text-text-muted">
          {saveState === 'saving' && 'Guardando resultado...'}
          {saveState === 'saved' && 'Resultado guardado en tu perfil.'}
          {saveState === 'error' && 'No se pudo guardar el resultado. Puedes repetir la medicion.'}
        </p>

        <button
          type="button"
          className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-text-on-accent"
          onClick={onReset}
        >
          Repetir medicion
        </button>
      </div>
    </main>
  );
}
