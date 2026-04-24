import useDiagnosis from '../../hooks/useDiagnosis';
import { VOICE_EXERCISES } from '../../services/exercises';
import type { PhonationFrame } from '../../types';

import type { VoiceExercise } from '../../types';

interface ResultsScreenProps {
  recordedResults: Map<string, PhonationFrame[]>;
  exercises: VoiceExercise[];
  onReset: () => void;
}

function getScoreColor(score: number): 'text-success' | 'text-warning' | 'text-danger' {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function getScoreBorderColor(score: number): 'border-success' | 'border-warning' | 'border-danger' {
  if (score >= 70) return 'border-success';
  if (score >= 40) return 'border-warning';
  return 'border-danger';
}

function truncateInstruction(instruction: string, maxLength: number): string {
  if (instruction.length <= maxLength) return instruction;
  return `${instruction.slice(0, maxLength - 3)}...`;
}

export const ResultsScreen = ({ recordedResults, exercises, onReset }: ResultsScreenProps) => {
  const { result } = useDiagnosis(recordedResults, exercises);

  if (!result) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 p-6">
        <p className="text-text-muted">Cargando resultados...</p>
      </div>
    );
  }

  const scoreColorClass = getScoreColor(result.overallScore);
  const scoreBorderClass = getScoreBorderColor(result.overallScore);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <div
          className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${scoreBorderClass}`}
        >
          <span className={`text-4xl font-bold ${scoreColorClass}`}>
            {Math.round(result.overallScore)}
          </span>
        </div>
        <p className="text-sm text-text-muted">Puntuación general</p>
      </div>

      <div className="w-full rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Frecuencia promedio</p>
        <p className="text-2xl font-bold text-text">{result.avgHz.toFixed(1)} Hz</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {result.exercises.map((exerciseResult) => {
          const matchingExercise = VOICE_EXERCISES.find((exercise) => exercise.id === exerciseResult.exerciseId);
          const instruction = matchingExercise?.instruction ?? exerciseResult.exerciseId;
          const stabilityColorClass = getScoreColor(exerciseResult.stability);

          return (
            <div
              key={exerciseResult.exerciseId}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text" title={instruction}>
                  {truncateInstruction(instruction, 40)}
                </p>
                {exerciseResult.breaks > 0 && (
                  <p className="text-xs text-danger">{exerciseResult.breaks} quiebres</p>
                )}
              </div>

              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${stabilityColorClass} bg-surface-alt`}
              >
                {Math.round(exerciseResult.stability)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full">
        <h2 className="text-lg font-bold text-text">Observaciones</h2>
        <div className="mt-2 flex flex-col gap-1">
          {result.observations.map((observation) => (
            <p key={observation} className="text-sm text-text-muted">
              • {observation}
            </p>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-xl bg-accent px-8 py-3 font-bold text-bg"
        onClick={onReset}
      >
        Repetir evaluación
      </button>
    </div>
  );
};
