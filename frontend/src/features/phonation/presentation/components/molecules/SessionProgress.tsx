interface SessionProgressProps {
  currentIndex: number;
  totalExercises: number;
  phase: 'idle' | 'countdown' | 'recording' | 'finished';
}

export const SessionProgress = ({
  currentIndex,
  totalExercises,
  phase,
}: SessionProgressProps) => {
  const isFinished = phase === 'finished';
  const statusText = isFinished
    ? 'Evaluación completada'
    : `Ejercicio ${currentIndex + 1} de ${totalExercises}`;
  const statusTextClass = isFinished ? 'text-success' : 'text-text-muted';

  return (
    <div className="flex flex-col items-center gap-3">
      <p className={`text-sm ${statusTextClass}`}>{statusText}</p>

      <div className="flex items-center gap-2">
        {Array.from({ length: totalExercises }).map((_, index) => {
          const isCompleted = isFinished || index < currentIndex;
          const isCurrent = !isFinished && index === currentIndex;

          let circleClass = 'bg-surface-alt border border-border';
          if (isCompleted) {
            circleClass = 'bg-success';
          } else if (isCurrent) {
            circleClass = 'bg-accent animate-scale-in';
          }

          const connectorClass = isFinished || index < currentIndex ? 'bg-success' : 'bg-border';

          return (
            <div key={index} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${circleClass}`} />
              {index < totalExercises - 1 && <span className={`h-0.5 w-4 ${connectorClass}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
