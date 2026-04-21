import { describe, expect, it } from 'vitest';
import { classifyLoudness, SILENCE_MARGIN_DB } from '../services/loudnessClassifier';
import type { LoudnessConfig } from '../types';

const config: LoudnessConfig = {
  presetId: 'test',
  label: 'Test',
  description: 'Test preset',
  minOffsetDb: 12,
  maxOffsetDb: 28,
  clipThresholdDbfs: -3,
};

const NOISE_FLOOR = -60;

describe('classifyLoudness — prioridad de bandas', () => {
  it('retorna clipping cuando db >= clipThresholdDbfs, ignorando todo lo demás', () => {
    expect(classifyLoudness(-3, NOISE_FLOOR, config)).toBe('clipping');
    expect(classifyLoudness(-2, NOISE_FLOOR, config)).toBe('clipping');
    expect(classifyLoudness(0, NOISE_FLOOR, config)).toBe('clipping');
  });

  it('retorna silence cuando db está por debajo del noise floor + SILENCE_MARGIN_DB', () => {
    expect(classifyLoudness(NOISE_FLOOR + SILENCE_MARGIN_DB - 1, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(NOISE_FLOOR, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(-100, NOISE_FLOOR, config)).toBe('silence');
  });

  it('retorna too-low cuando hay voz pero está por debajo del óptimo', () => {
    // -60 + 6 = -54 (límite de silencio), -60 + 12 = -48 (inicio del óptimo)
    expect(classifyLoudness(-54, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(-50, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(-49, NOISE_FLOOR, config)).toBe('too-low');
  });

  it('retorna optimal dentro del rango del preset', () => {
    // -60 + 12 = -48 (inicio), -60 + 28 = -32 (fin)
    expect(classifyLoudness(-48, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(-40, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(-33, NOISE_FLOOR, config)).toBe('optimal');
  });

  it('retorna too-high cuando supera el máximo del preset sin llegar a clipping', () => {
    // -60 + 28 = -32 (fin del óptimo), -3 (clipping)
    expect(classifyLoudness(-32, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(-20, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(-4, NOISE_FLOOR, config)).toBe('too-high');
  });
});

describe('classifyLoudness — límites exactos', () => {
  it('el límite de silencio es exactamente noiseFloor + SILENCE_MARGIN_DB', () => {
    const boundary = NOISE_FLOOR + SILENCE_MARGIN_DB;
    expect(classifyLoudness(boundary - 0.001, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(boundary, NOISE_FLOOR, config)).toBe('too-low');
  });

  it('el límite inferior del óptimo es exactamente noiseFloor + minOffsetDb', () => {
    const boundary = NOISE_FLOOR + config.minOffsetDb;
    expect(classifyLoudness(boundary - 0.001, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(boundary, NOISE_FLOOR, config)).toBe('optimal');
  });

  it('el límite superior del óptimo es exactamente noiseFloor + maxOffsetDb', () => {
    const boundary = NOISE_FLOOR + config.maxOffsetDb;
    expect(classifyLoudness(boundary - 0.001, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(boundary, NOISE_FLOOR, config)).toBe('too-high');
  });

  it('el límite de clipping es exactamente clipThresholdDbfs', () => {
    expect(classifyLoudness(config.clipThresholdDbfs - 0.001, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(config.clipThresholdDbfs, NOISE_FLOOR, config)).toBe('clipping');
  });
});

describe('classifyLoudness — noise floor variable', () => {
  it('las bandas se desplazan correctamente al cambiar el noise floor', () => {
    const highNoise = -30;
    // silence: < -30 + 6 = -24
    expect(classifyLoudness(-25, highNoise, config)).toBe('silence');
    // too-low: -24 a -18 (-30 + 12)
    expect(classifyLoudness(-20, highNoise, config)).toBe('too-low');
    // optimal: -18 a -2 (-30 + 28)
    expect(classifyLoudness(-10, highNoise, config)).toBe('optimal');
    // too-high: -2 a -3 (clipping) → en este caso solapado, clipping gana
    expect(classifyLoudness(-3, highNoise, config)).toBe('clipping');
  });
});
