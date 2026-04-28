import { useState, useCallback } from 'react';
import { VOICE_EXERCISES } from '../../services/exercises';
import type { VoiceExercise } from '../../types';

interface EvaluationMenuProps {
  onStart: (selectedExercises: VoiceExercise[]) => void;
}

const typeLabels: Record<VoiceExercise['type'], string> = {
  sustained: 'Vocales sostenidas',
  phrase: 'Frases',
  glissando: 'Glissando',
};

const typeGradients: Record<VoiceExercise['type'], string> = {
  sustained: 'from-amber-500/20 to-amber-500/5',
  phrase: 'from-emerald-500/20 to-emerald-500/5',
  glissando: 'from-violet-500/20 to-violet-500/5',
};

const typeBorderColors: Record<VoiceExercise['type'], string> = {
  sustained: 'border-amber-500/30',
  phrase: 'border-emerald-500/30',
  glissando: 'border-violet-500/30',
};

const typeIconBg: Record<VoiceExercise['type'], string> = {
  sustained: 'bg-amber-500/20',
  phrase: 'bg-emerald-500/20',
  glissando: 'bg-violet-500/20',
};

const exerciseTypes: VoiceExercise['type'][] = ['sustained', 'phrase', 'glissando'];

export const EvaluationMenu = ({ onStart }: EvaluationMenuProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(VOICE_EXERCISES.map((e) => e.id)),
  );

  const toggleExercise = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(VOICE_EXERCISES.map((e) => e.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;
  const totalDuration = VOICE_EXERCISES.filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.durationMs, 0);
  const totalSeconds = Math.round(totalDuration / 1000);

  const handleStart = () => {
    const selected = VOICE_EXERCISES.filter((e) => selectedIds.has(e.id));
    if (selected.length > 0) {
      onStart(selected);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-b from-accent/10 to-transparent px-4 pt-8 pb-4">
        <div className="mx-auto w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-text">Evaluación de Voz</h1>
          <p className="mt-1 text-sm text-text-muted">
            Selecciona los ejercicios a realizar
          </p>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="mx-auto w-full max-w-md">
          {/* Quick Actions */}
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="flex-1 rounded-xl border border-border/50 bg-surface py-2.5 text-sm font-medium text-text shadow-sm transition-all active:scale-95"
            >
              ✓ Todos
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="flex-1 rounded-xl border border-border/50 bg-surface py-2.5 text-sm font-medium text-text shadow-sm transition-all active:scale-95"
            >
              ✕ Ninguno
            </button>
          </div>

          {/* Exercise Groups by Type */}
          <div className="flex flex-col gap-6">
            {exerciseTypes.map((type) => {
              const exercisesOfType = VOICE_EXERCISES.filter((e) => e.type === type);
              const selectedCountOfType = exercisesOfType.filter((e) => selectedIds.has(e.id)).length;

              return (
                <div key={type}>
                  {/* Type Header */}
                  <div className="mb-3 flex items-center gap-2.5">
                    <div>
                      <h2 className="text-sm font-semibold text-text">{typeLabels[type]}</h2>
                      <p className="text-xs text-text-muted">
                        {selectedCountOfType} de {exercisesOfType.length} seleccionados
                      </p>
                    </div>
                  </div>

                  {/* Exercise Items */}
                  <div className="flex flex-col gap-2">
                    {exercisesOfType.map((exercise) => {
                      const isSelected = selectedIds.has(exercise.id);
                      const durationSeconds = exercise.durationMs / 1000;

                      return (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() => toggleExercise(exercise.id)}
                          className={`group flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98] ${
                            isSelected
                              ? `border-accent bg-gradient-to-r ${typeGradients[type]}`
                              : 'border-border/50 bg-surface hover:border-border'
                          }`}
                        >
                          {/* Check */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-accent bg-accent shadow-sm'
                                : 'border-border/50 bg-surface-alt'
                            }`}
                          >
                            {isSelected && (
                              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text">
                              {exercise.instruction}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="inline-flex items-center rounded-md bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                {durationSeconds}s
                              </span>
                              <span className="inline-flex items-center rounded-md bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                {exercise.targetHzRange.min}-{exercise.targetHzRange.max} Hz
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 border-t border-border/50 bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={selectedCount === 0}
            className="w-full rounded-xl bg-accent py-3.5 text-base font-bold text-bg shadow-lg shadow-accent/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {selectedCount === 0
              ? 'Selecciona al menos un ejercicio'
              : `Iniciar evaluación · ${selectedCount} ejercicios · ${totalSeconds}s`}
          </button>
        </div>
      </div>
    </div>
  );
};
