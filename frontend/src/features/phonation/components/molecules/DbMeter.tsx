import SmallText from '../atoms/SmallText';

const DB_MIN = -80;
const DB_MAX = 0;

interface DbMeterProps {
  db: number;
}

export default function DbMeter({ db }: DbMeterProps) {
  const normalized = ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100;
  const width = Math.min(100, Math.max(0, normalized));

  let meterColor = 'bg-success';
  if (db >= -6) meterColor = 'bg-danger';
  else if (db >= -20) meterColor = 'bg-warning';

  return (
    <div className="rounded-[10px] border border-border bg-surface-alt p-3">
      <SmallText className="mb-2">Intensidad (dB)</SmallText>
      <div className="h-3.5 rounded-full border border-border bg-surface">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${meterColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <SmallText className="mt-2">Valor actual: {db.toFixed(1)} dB</SmallText>
    </div>
  );
}
