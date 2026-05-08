import { VOICE_EXERCISES } from '../../../services/exercises';
import type { VoiceExercise } from '../../../types';
import { useExerciseSelection } from '../../../hooks/useExerciseSelection';

interface EvaluationMenuProps {
  onStart: (selectedExercises: VoiceExercise[]) => void;
}

const typeLabels: Record<VoiceExercise['type'], string> = {
  sustained: 'Vocales sostenidas',
  phrase: 'Frases',
  glissando: 'Glissando',
};

const exerciseTypes: VoiceExercise['type'][] = ['sustained', 'phrase', 'glissando'];

export const EvaluationMenu = ({ onStart }: EvaluationMenuProps) => {
  const { selectedIds, selectedCount, toggle, selectAll, deselectAll, getSelectedExercises } =
    useExerciseSelection();

  const handleStart = () => {
    const selected = getSelectedExercises();
    if (selected.length > 0) {
      onStart(selected);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 p-6 pb-28 relative z-10">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 relative text-center mt-4">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none animate-pulse-glow" />
        <p className="text-xs font-bold uppercase tracking-widest text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] relative z-10">Evaluación de Voz</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10">Ejercicios</h1>
        <p className="text-sm font-medium text-text-muted bg-surface-alt/50 px-4 py-2 rounded-full border border-white/5 relative z-10 mt-2">
          Selecciona los ejercicios a realizar
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={selectAll}
            className="flex-1 relative overflow-hidden rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-sm py-3.5 text-sm font-bold text-text shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-95 hover:border-accent/60 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 group-hover:text-accent transition-colors">✓ Todos</span>
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="flex-1 relative overflow-hidden rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-sm py-3.5 text-sm font-bold text-text shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-95 hover:border-accent/60 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 group-hover:text-accent transition-colors">✕ Ninguno</span>
          </button>
        </div>

        {/* Exercise Groups by Type */}
        <div className="flex flex-col gap-6">
          {exerciseTypes.map((type) => {
            const exercisesOfType = VOICE_EXERCISES.filter((e) => e.type === type);
            const selectedCountOfType = exercisesOfType.filter((e) => selectedIds.has(e.id)).length;

            return (
              <div key={type} className="animate-fade-in bg-surface/40 backdrop-blur-sm p-5 rounded-3xl border border-border/50">
                {/* Type Header */}
                <div className="mb-4">
                  <h2 className="text-base font-bold text-text tracking-wide">{typeLabels[type]}</h2>
                  <p className="text-xs font-medium text-text-muted mt-1">
                    {selectedCountOfType} de {exercisesOfType.length} seleccionados
                  </p>
                </div>

                {/* Exercise Items */}
                <div className="flex flex-col gap-3">
                  {exercisesOfType.map((exercise) => {
                    const isSelected = selectedIds.has(exercise.id);
                    const durationSeconds = exercise.durationMs / 1000;

                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => toggle(exercise.id)}
                        className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 active:scale-95 ${
                          isSelected
                            ? `border-accent/60 bg-surface/80 shadow-[0_5px_15px_-5px_rgba(245,158,11,0.15)]`
                            : 'border-border/40 bg-surface/30 hover:bg-surface/60'
                        }`}
                      >
                        {/* Check */}
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            isSelected
                              ? 'border-accent bg-accent shadow-[0_0_8px_rgba(245,158,11,0.5)]'
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
                          <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-accent' : 'text-text/90'}`}>
                            {exercise.instruction}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-lg bg-surface-alt/80 px-2 py-0.5 text-[10px] font-bold text-text-muted border border-white/5">
                              {durationSeconds}s
                            </span>
                            <span className="inline-flex items-center rounded-lg bg-surface-alt/80 px-2 py-0.5 text-[10px] font-bold text-text-muted border border-white/5">
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

      <button
        type="button"
        onClick={handleStart}
        disabled={selectedCount === 0}
        className="mt-2 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 text-base font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale disabled:shadow-none hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
      >
        <span className="relative z-10">
          {selectedCount === 0
            ? 'SELECCIONA EJERCICIOS'
            : `INICIAR EVALUACIÓN (${selectedCount})`}
        </span>
      </button>
    </div>
  );
};
