interface ExercisePromptProps {
  instruction: string;
  countdown: number;
  isCountdown: boolean;
  elapsedMs: number;
  durationMs: number;
  isRecording: boolean;
}

export const ExercisePrompt = ({
  instruction,
  countdown,
  isCountdown,
  elapsedMs,
  durationMs,
  isRecording,
}: ExercisePromptProps) => {
  const progressPercent = durationMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100)) : 0;
  const remainingSeconds = Math.ceil(Math.max(0, durationMs - elapsedMs) / 1000);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <p className="text-center text-xl text-text">{instruction}</p>

      {isCountdown && (
        <p className="animate-scale-in text-6xl font-bold text-accent">{countdown}</p>
      )}

      {isRecording && (
        <div className="w-full">
          <div className="h-2 w-full rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-accent transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-text-muted">{remainingSeconds}s restantes</p>
        </div>
      )}
    </div>
  );
};
