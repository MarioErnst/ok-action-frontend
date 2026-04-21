import BandLabel from '../atoms/BandLabel';
import type { LoudnessBand, LoudnessConfig } from '../../types';

interface LoudnessMeterProps {
  db: number;
  noiseFloor: number;
  config: LoudnessConfig;
  band: LoudnessBand;
}

const SILENCE_MARGIN_DB = 6;
const METER_PADDING_DB = 10;

interface MeterRange {
  startDb: number;
  silenceEndDb: number;
  minOffsetDb: number;
  maxOffsetDb: number;
  endDb: number;
}

interface SegmentSpec {
  startPct: number;
  widthPct: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMeterRange(noiseFloor: number, config: LoudnessConfig): MeterRange {
  return {
    startDb: noiseFloor,
    silenceEndDb: noiseFloor + SILENCE_MARGIN_DB,
    minOffsetDb: noiseFloor + config.minOffsetDb,
    maxOffsetDb: noiseFloor + config.maxOffsetDb,
    endDb: noiseFloor + config.maxOffsetDb + METER_PADDING_DB,
  };
}

function toPercent(valueDb: number, range: MeterRange): number {
  const total = range.endDb - range.startDb;
  if (total <= 0) return 0;
  return ((valueDb - range.startDb) / total) * 100;
}

function toSegment(startDb: number, endDb: number, range: MeterRange): SegmentSpec {
  const startPct = clamp(toPercent(startDb, range), 0, 100);
  const endPct = clamp(toPercent(endDb, range), 0, 100);
  return {
    startPct,
    widthPct: Math.max(0, endPct - startPct),
  };
}

function getCursorPosition(db: number, range: MeterRange): number {
  return clamp(toPercent(db, range), 0, 100);
}

export default function LoudnessMeter({ db, noiseFloor, config, band }: LoudnessMeterProps) {
  const range = getMeterRange(noiseFloor, config);
  const silenceSegment = toSegment(range.startDb, range.silenceEndDb, range);
  const lowSegment = toSegment(range.silenceEndDb, range.minOffsetDb, range);
  const optimalSegment = toSegment(range.minOffsetDb, range.maxOffsetDb, range);
  const highSegment = toSegment(range.maxOffsetDb, range.endDb, range);
  const cursorPosition = getCursorPosition(db, range);

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