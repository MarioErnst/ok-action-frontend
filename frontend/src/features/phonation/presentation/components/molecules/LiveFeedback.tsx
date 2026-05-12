interface LiveFeedbackProps {
  hz: number | null;
  db: number;
  targetHzRange: {
    min: number;
    max: number;
  };
  isRecording: boolean;
}

const DB_MIN = -60;
const DB_MAX = 0;

function getDbPercent(db: number): number {
  const normalized = ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100;
  return Math.min(100, Math.max(0, normalized));
}

export const LiveFeedback = ({
  hz,
  db,
  targetHzRange,
  isRecording,
}: LiveFeedbackProps) => {
  if (!isRecording) {
    return null;
  }

  const isInRange = hz !== null && hz >= targetHzRange.min && hz <= targetHzRange.max;

  let hzColorClass = 'text-text-muted';
  if (hz !== null) {
    hzColorClass = isInRange ? 'text-success' : 'text-danger';
  }

  let rangeMessage = 'No se detecta voz';
  let rangeColorClass = 'text-text-muted';

  if (hz !== null) {
    rangeMessage = isInRange ? 'Dentro del rango esperado' : 'Fuera del rango esperado';
    rangeColorClass = isInRange ? 'text-success' : 'text-danger';
  }

  let dbColorClass = 'bg-success';
  if (db >= -6) dbColorClass = 'bg-danger';
  else if (db >= -20) dbColorClass = 'bg-warning';

  const dbPercent = getDbPercent(db);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <p className={`text-4xl font-bold ${hzColorClass}`}>{hz === null ? '—' : hz.toFixed(1)}</p>
      <p className="text-sm text-text-muted">Hz</p>
      <p className={`text-xs ${rangeColorClass}`}>{rangeMessage}</p>

      <div className="w-full">
        <div className="h-2 w-full rounded-full bg-surface-alt">
          <div
            className={`h-full rounded-full transition-all duration-100 ${dbColorClass}`}
            style={{ width: `${dbPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
