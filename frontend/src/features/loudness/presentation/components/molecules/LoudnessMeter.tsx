import BandLabel from '../atoms/BandLabel';
import type { LoudnessBand, LoudnessConfig } from '../../../domain/LoudnessSession';

interface LoudnessMeterProps {
  db: number;
  noiseFloor: number;
  config: LoudnessConfig;
  band: LoudnessBand;
}

// Fixed display range: covers the full usable dBFS spectrum for voice
const METER_MIN_DBFS = -65;
const METER_MAX_DBFS = 0;
const METER_RANGE = METER_MAX_DBFS - METER_MIN_DBFS;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(db: number): number {
  return clamp(((db - METER_MIN_DBFS) / METER_RANGE) * 100, 0, 100);
}

function toSegment(startDb: number, endDb: number): { startPct: number; widthPct: number } {
  const startPct = toPercent(startDb);
  const endPct = toPercent(endDb);
  return { startPct, widthPct: Math.max(0, endPct - startPct) };
}

export default function LoudnessMeter({ db, noiseFloor, config, band }: LoudnessMeterProps) {
  const silenceThresholdDb = noiseFloor + config.silenceOffsetDb;

  // Silence zone: from meter start to the calibrated silence threshold (dynamic)
  const silenceSegment = toSegment(METER_MIN_DBFS, silenceThresholdDb);
  // Too-low zone: from silence threshold to tooLowCeiling (absolute)
  const lowSegment = toSegment(silenceThresholdDb, config.tooLowCeilingDbfs);
  // Optimal zone: from tooLowCeiling to optimalCeiling (absolute)
  const optimalSegment = toSegment(config.tooLowCeilingDbfs, config.optimalCeilingDbfs);
  // Too-high zone: from optimalCeiling to meter end (absolute)
  const highSegment = toSegment(config.optimalCeilingDbfs, METER_MAX_DBFS);

  const cursorPosition = toPercent(db);

  return (
    <div className="w-full rounded-[10px] border border-border bg-surface-alt p-3">
      <div className="relative h-6 w-full overflow-hidden rounded-full border border-border bg-surface">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <rect x="0" y="0" width="100" height="100" className="fill-surface" />
          <rect x={silenceSegment.startPct} y="0" width={silenceSegment.widthPct} height="100" className="fill-surface" />
          <rect x={lowSegment.startPct} y="0" width={lowSegment.widthPct} height="100" className="fill-warning" />
          <rect x={optimalSegment.startPct} y="0" width={optimalSegment.widthPct} height="100" className="fill-success" />
          <rect x={highSegment.startPct} y="0" width={highSegment.widthPct} height="100" className="fill-danger" />
        </svg>

        <div
          className={`pointer-events-none absolute top-0 bottom-0 w-0.5 bg-text ${band === 'silence' ? 'opacity-30' : 'opacity-100'}`}
          style={{ left: `${cursorPosition}%` }}
        />
      </div>

      <div className="mt-2">
        <BandLabel band={band} />
      </div>
    </div>
  );
}
