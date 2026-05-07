import { describe, expect, it } from 'vitest';
import { analyzePauseFrames, classifyPauseMetrics } from '../services/pauseAnalysis';
import type { PhonationFrame } from '../../phonation/types';

const NOISE_FLOOR = -60;

function frame(timestamp: number, db: number): PhonationFrame {
  return { hz: null, db, timestamp };
}

describe('analyzePauseFrames', () => {
  it('retorna metricas vacias cuando no hay pausas', () => {
    const metrics = analyzePauseFrames(
      [frame(0, -40), frame(500, -42), frame(1000, -41), frame(1500, -39)],
      NOISE_FLOOR,
      2000,
    );

    expect(metrics.totalPauses).toBe(0);
    expect(metrics.totalPauseDurationMs).toBe(0);
    expect(metrics.classification).toBe('pocas pausas');
  });

  it('detecta una pausa valida por duracion minima', () => {
    const metrics = analyzePauseFrames(
      [frame(0, -40), frame(500, -70), frame(1400, -39), frame(2000, -38)],
      NOISE_FLOOR,
      2500,
    );

    expect(metrics.totalPauses).toBe(1);
    expect(metrics.pauses[0]).toEqual({ startMs: 500, endMs: 1400, durationMs: 900 });
    expect(metrics.longestPauseMs).toBe(900);
  });

  it('ignora micro silencios menores a 500 ms', () => {
    const metrics = analyzePauseFrames(
      [frame(0, -40), frame(500, -70), frame(800, -39), frame(1200, -40)],
      NOISE_FLOOR,
      1500,
    );

    expect(metrics.totalPauses).toBe(0);
  });

  it('une pausas separadas por gaps muy cortos', () => {
    const metrics = analyzePauseFrames(
      [
        frame(0, -40),
        frame(500, -70),
        frame(1000, -39),
        frame(1100, -70),
        frame(1700, -39),
      ],
      NOISE_FLOOR,
      2000,
    );

    expect(metrics.totalPauses).toBe(1);
    expect(metrics.pauses[0]).toEqual({ startMs: 500, endMs: 1700, durationMs: 1200 });
  });

  it('clasifica por ratio de silencio', () => {
    expect(classifyPauseMetrics(0, 0)).toBe('pocas pausas');
    expect(classifyPauseMetrics(1, 0.18)).toBe('pausas adecuadas');
    expect(classifyPauseMetrics(4, 0.5)).toBe('demasiadas pausas');
  });
});
