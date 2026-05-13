import { useEffect, useRef } from 'react';

interface WaveformBarsProps {
  /**
   * The Web Audio AnalyserNode that feeds the visualisation. When null the
   * component renders an idle row of bars so the layout never collapses
   * while a stream is being set up.
   */
  analyser: AnalyserNode | null;
  /**
   * When false the component stops sampling the analyser (saves CPU/battery)
   * and renders the idle state instead.
   */
  active: boolean;
  /** Number of bars rendered horizontally. Defaults to 32. */
  bars?: number;
  /** Bar container height in pixels. Bars scale within this box. */
  height?: number;
  /** Active fill color. Accepts any CSS color, defaults to the accent token. */
  color?: string;
  /** Idle fill color when inactive or while waiting for audio. */
  inactiveColor?: string;
  className?: string;
}

// Cap to 30fps to comply with the project's mobile-friendly animation budget
// (per CLAUDE.md the ML inference loops use 15fps; for pure 2D drawing 30fps
// is generous and still smooth to the eye).
const TARGET_FRAME_INTERVAL_MS = 1000 / 30;

// Exponential moving-average factor: 0=no smoothing, 1=frozen. 0.55 gives a
// responsive but non-jittery feel for voice envelopes.
const SMOOTHING_FACTOR = 0.55;

// FFT size: 256 bins gives 128 frequency cells, of which the first ~32 cover
// voice frequencies (~0-6 kHz at 48 kHz sample rate). Larger sizes increase
// latency without helping the visual.
const FFT_SIZE = 256;

// Floor value (0..1) for inactive bars so the idle state still has presence.
const IDLE_BAR_HEIGHT = 0.08;

export const WaveformBars = ({
  analyser,
  active,
  bars = 32,
  height = 48,
  color = 'var(--color-accent)',
  inactiveColor = 'var(--color-text-muted)',
  className,
}: WaveformBarsProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Smoothed bar heights (0..1) kept in a ref so RAF reads/writes them
  // without triggering React re-renders.
  const smoothedRef = useRef<Float32Array>(new Float32Array(bars));

  useEffect(() => {
    // Re-allocate when the bars count changes between renders.
    if (smoothedRef.current.length !== bars) {
      smoothedRef.current = new Float32Array(bars);
    }
  }, [bars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    if (analyser) {
      analyser.fftSize = FFT_SIZE;
    }

    const frequencyBuffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let rafId: number | null = null;
    let lastFrameMs = 0;

    const drawIdle = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height: h } = canvas;
      ctx.clearRect(0, 0, width, h);
      paintBars(ctx, width, h, bars, () => IDLE_BAR_HEIGHT, inactiveColor);
    };

    const drawFrame = (timestamp: number) => {
      rafId = requestAnimationFrame(drawFrame);
      if (timestamp - lastFrameMs < TARGET_FRAME_INTERVAL_MS) return;
      lastFrameMs = timestamp;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!analyser || !frequencyBuffer) {
        drawIdle();
        return;
      }

      analyser.getByteFrequencyData(frequencyBuffer);

      // Map the first `bars` FFT cells to bar amplitudes, keeping voice band.
      const bucketSize = Math.max(1, Math.floor(frequencyBuffer.length / bars / 2));
      const smoothed = smoothedRef.current;
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        const start = i * bucketSize;
        for (let j = 0; j < bucketSize; j++) {
          sum += frequencyBuffer[start + j] ?? 0;
        }
        const raw = sum / bucketSize / 255; // normalize to 0..1
        smoothed[i] = smoothed[i] * SMOOTHING_FACTOR + raw * (1 - SMOOTHING_FACTOR);
      }

      const { width, height: h } = canvas;
      ctx.clearRect(0, 0, width, h);
      paintBars(
        ctx,
        width,
        h,
        bars,
        (i) => Math.max(IDLE_BAR_HEIGHT, smoothed[i]),
        color,
      );
    };

    if (active && analyser) {
      rafId = requestAnimationFrame(drawFrame);
    } else {
      drawIdle();
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [analyser, active, bars, color, inactiveColor]);

  // Keep the backing store matched to the container's pixel ratio for
  // crisp bars on retina/HiDPI screens without redrawing on every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Visualización de audio"
      style={{ height, width: '100%' }}
      className={className}
    />
  );
};

function paintBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bars: number,
  heightAt: (index: number) => number,
  fillStyle: string,
) {
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = width / dpr;
  const logicalHeight = height / dpr;
  const gap = Math.max(2, logicalWidth / bars / 4);
  const barWidth = (logicalWidth - gap * (bars - 1)) / bars;
  const centerY = logicalHeight / 2;
  const radius = barWidth / 2;

  ctx.fillStyle = fillStyle;
  for (let i = 0; i < bars; i++) {
    const amp = heightAt(i);
    const barHeight = Math.max(radius * 2, amp * logicalHeight);
    const x = i * (barWidth + gap);
    const y = centerY - barHeight / 2;
    roundedRect(ctx, x, y, barWidth, barHeight, radius);
    ctx.fill();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
