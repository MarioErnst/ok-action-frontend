import { useEffect, useMemo, useRef } from 'react';
import type { PhonationFrame } from '../../types';
import { colors } from '../../theme';
import PhonationButton from '../atoms/PhonationButton';
import SmallText from '../atoms/SmallText';
import DbMeter from '../molecules/DbMeter';
import PitchReadout from '../molecules/PitchReadout';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 120;
const HZ_MIN = 75;
const HZ_MAX = 400;
// ~30 frames a 15 fps ≈ 2 segundos sin voz antes de alertar
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

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT / 2);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.stroke();

      ctx.strokeStyle = colors.accent;
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
    };

    draw();
    return undefined;
  }, [frames]);

  return (
    <section
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {!isListening && <PhonationButton label="Ingresar" onClick={onStart} />}
          {isListening && !isCalibrating && (
            <PhonationButton label="Detener" onClick={onStop} variant="secondary" />
          )}
          {isCalibrating && <PhonationButton label="Calibrando..." disabled variant="secondary" />}
        </div>

        {isCalibrating && (
          <SmallText margin="0 0 12px 0">Calibrando ambiente, por favor manten silencio...</SmallText>
        )}

        <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
          <PitchReadout hz={hz} isCalibrating={isCalibrating} />
          <DbMeter db={db} />
        </div>

        <div
          style={{
            background: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <SmallText margin="0 0 8px 0">Estabilidad de tono (ultimo historial)</SmallText>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ width: '100%', maxWidth: CANVAS_WIDTH, border: `1px solid ${colors.border}`, borderRadius: 8 }}
          />
        </div>

        {isAlert && (
          <div
            style={{
              border: `1px solid ${colors.accent}`,
              background: colors.surfaceAlt,
              borderRadius: 10,
              padding: '10px 12px',
              color: colors.accent,
              fontWeight: 600,
            }}
          >
            No se detecta voz. Verifica el microfono o habla mas fuerte.
          </div>
        )}
      </div>
    </section>
  );
}
