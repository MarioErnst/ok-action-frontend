import { useEffect, useMemo, useRef } from 'react';
import type { PhonationFrame } from '../../../domain/PhonationSession';
import PhonationButton from '../atoms/PhonationButton';
import SmallText from '../atoms/SmallText';
import DbMeter from '../molecules/DbMeter';
import PitchReadout from '../molecules/PitchReadout';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 120;
const HZ_MIN = 75;
const HZ_MAX = 400;
const ALERT_FRAME_WINDOW = 30;

interface PhonationDisplayProps {
  hz?: number | null;
  db?: number;
  isListening?: boolean;
  isCalibrating?: boolean;
  frames?: PhonationFrame[];
  onStart?: () => void;
  onStop?: () => void;
}

export default function PhonationDisplay({
  hz = null,
  db = -100,
  isListening = false,
  isCalibrating = false,
  frames = [],
  onStart = () => {},
  onStop = () => {},
}: PhonationDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isAlert = useMemo(() => {
    if (!isListening || isCalibrating || frames.length < ALERT_FRAME_WINDOW) return false;
    const tail = frames.slice(-ALERT_FRAME_WINDOW);
    return tail.every((item) => item.hz == null);
  }, [frames, isCalibrating, isListening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let hasPath = false;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame?.hz == null) {
        hasPath = false;
        continue;
      }

      const x = frames.length <= 1 ? 0 : (i / (frames.length - 1)) * CANVAS_WIDTH;
      const clampedHz = Math.max(HZ_MIN, Math.min(HZ_MAX, frame.hz));
      const ratio = (clampedHz - HZ_MIN) / (HZ_MAX - HZ_MIN);
      const y = CANVAS_HEIGHT - ratio * CANVAS_HEIGHT;

      if (!hasPath) {
        ctx.moveTo(x, y);
        hasPath = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    return undefined;
  }, [frames]);

  return (
    <section className="rounded-[14px] border border-border bg-bg p-4">
      <div className="rounded-xl border border-border bg-surface p-3.5">
        <div className="mb-3 flex gap-2.5">
          {!isListening && <PhonationButton label="Ingresar" onClick={onStart} />}
          {isListening && !isCalibrating && (
            <PhonationButton label="Detener" onClick={onStop} variant="secondary" />
          )}
          {isCalibrating && <PhonationButton label="Calibrando..." onClick={() => {}} disabled variant="secondary" />}
        </div>

        {isCalibrating && (
          <SmallText className="mb-3">Calibrando ambiente, por favor manten silencio...</SmallText>
        )}

        <div className="mb-2.5 grid gap-2.5">
          <PitchReadout hz={hz} isCalibrating={isCalibrating} />
          <DbMeter db={db} />
        </div>

        <div className="mb-2.5 rounded-[10px] border border-border bg-surface-alt p-2.5">
          <SmallText className="mb-2">Estabilidad de tono (ultimo historial)</SmallText>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full rounded-lg border border-border"
          />
        </div>

        {isAlert && (
          <div className="rounded-[10px] border border-accent bg-surface-alt px-3 py-2.5 font-semibold text-accent">
            No se detecta voz. Verifica el microfono o habla mas fuerte.
          </div>
        )}
      </div>
    </section>
  );
}
