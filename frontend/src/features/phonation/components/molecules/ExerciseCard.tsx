import { VOICE_EXERCISES } from '../../services/exercises';
import type { VoiceExercise } from '../../types';

interface ExerciseCardProps {
  exercise: VoiceExercise;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const typeLabels: Record<VoiceExercise['type'], string> = {
  sustained: 'Sostenido',
  phrase: 'Frase',
  glissando: 'Glissando',
};

const typeIcons: Record<VoiceExercise['type'], string> = {
  sustained: '🎵',
  phrase: '📖',
  glissando: '🎶',
};

export const ExerciseCard = ({ exercise, isSelected, onToggle }: ExerciseCardProps) => {
  const durationSeconds = exercise.durationMs / 1000;

  return (
    <button
      type="button"
      onClick={() => onToggle(exercise.id)}
      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
        isSelected
          ? 'border-accent bg-accent/10 shadow-md'
          : 'border-border bg-surface hover:border-accent/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${
            isSelected ? 'bg-accent' : 'bg-surface-alt'
          }`}
        >
          {typeIcons[exercise.type]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">{exercise.instruction}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md bg-surface-alt px-2 py-0.5 text-xs text-text-muted">
              {typeLabels[exercise.type]}
            </span>
            <span className="rounded-md bg-surface-alt px-2 py-0.5 text-xs text-text-muted">
              {durationSeconds}s
            </span>
            <span className="rounded-md bg-surface-alt px-2 py-0.5 text-xs text-text-muted">
              {exercise.targetHzRange.min}-{exercise.targetHzRange.max} Hz
            </span>
          </div>
        </div>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            isSelected ? 'border-accent bg-accent' : 'border-border'
          }`}
        >
          {isSelected && (
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};
