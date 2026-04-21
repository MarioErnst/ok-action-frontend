import { describe, expect, it } from 'vitest';
import { classifyLoudness } from '../services/loudnessClassifier';
import type { LoudnessConfig } from '../types';

const config: LoudnessConfig = {
  presetId: 'test',
  label: 'Test',
  description: 'Test preset',
  silenceOffsetDb: 6,
  tooLowCeilingDbfs: -45,
  optimalCeilingDbfs: -22,
  clipThresholdDbfs: -3,
};

const NOISE_FLOOR = -60;
const SILENCE_THRESHOLD = NOISE_FLOOR + config.silenceOffsetDb; // -54

describe('classifyLoudness — prioridad de bandas', () => {
  it('retorna clipping cuando db >= clipThresholdDbfs', () => {
    expect(classifyLoudness(-3, NOISE_FLOOR, config)).toBe('clipping');
    expect(classifyLoudness(-2, NOISE_FLOOR, config)).toBe('clipping');
    expect(classifyLoudness(0, NOISE_FLOOR, config)).toBe('clipping');
  });

  it('retorna silence cuando db está por debajo del noise floor + silenceOffsetDb', () => {
    expect(classifyLoudness(SILENCE_THRESHOLD - 1, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(NOISE_FLOOR, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(-100, NOISE_FLOOR, config)).toBe('silence');
  });

  it('retorna too-low cuando hay voz pero está por debajo del óptimo', () => {
    // Between SILENCE_THRESHOLD (-54) and tooLowCeiling (-45)
    expect(classifyLoudness(-54, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(-50, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(-46, NOISE_FLOOR, config)).toBe('too-low');
  });

  it('retorna optimal dentro del rango absoluto del preset', () => {
    // Between tooLowCeiling (-45) and optimalCeiling (-22)
    expect(classifyLoudness(-45, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(-33, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(-23, NOISE_FLOOR, config)).toBe('optimal');
  });

  it('retorna too-high cuando supera el techo óptimo sin llegar a clipping', () => {
    // Between optimalCeiling (-22) and clipThreshold (-3)
    expect(classifyLoudness(-22, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(-15, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(-4, NOISE_FLOOR, config)).toBe('too-high');
  });
});

describe('classifyLoudness — límites exactos', () => {
  it('el límite de silencio es exactamente noiseFloor + silenceOffsetDb', () => {
    expect(classifyLoudness(SILENCE_THRESHOLD - 0.001, NOISE_FLOOR, config)).toBe('silence');
    expect(classifyLoudness(SILENCE_THRESHOLD, NOISE_FLOOR, config)).toBe('too-low');
  });

  it('el límite inferior del óptimo es exactamente tooLowCeilingDbfs', () => {
    expect(classifyLoudness(config.tooLowCeilingDbfs - 0.001, NOISE_FLOOR, config)).toBe('too-low');
    expect(classifyLoudness(config.tooLowCeilingDbfs, NOISE_FLOOR, config)).toBe('optimal');
  });

  it('el límite superior del óptimo es exactamente optimalCeilingDbfs', () => {
    expect(classifyLoudness(config.optimalCeilingDbfs - 0.001, NOISE_FLOOR, config)).toBe('optimal');
    expect(classifyLoudness(config.optimalCeilingDbfs, NOISE_FLOOR, config)).toBe('too-high');
  });

  it('el límite de clipping es exactamente clipThresholdDbfs', () => {
    expect(classifyLoudness(config.clipThresholdDbfs - 0.001, NOISE_FLOOR, config)).toBe('too-high');
    expect(classifyLoudness(config.clipThresholdDbfs, NOISE_FLOOR, config)).toBe('clipping');
  });
});

describe('classifyLoudness — zonas de calidad son absolutas (independientes del noise floor)', () => {
  it('el mismo nivel de voz cae en optimal independientemente del noise floor (mientras esté sobre el umbral de silencio)', () => {
    // Voice at -30 dBFS with different quiet/normal rooms (silence threshold stays below -30)
    // quietRoom (-70): threshold = -64, -30 > -64 → not silence → optimal
    // normalRoom (-60): threshold = -54, -30 > -54 → not silence → optimal
    // midRoom (-50):    threshold = -44, -30 > -44 → not silence → optimal
    expect(classifyLoudness(-30, -70, config)).toBe('optimal');
    expect(classifyLoudness(-30, -60, config)).toBe('optimal');
    expect(classifyLoudness(-30, -50, config)).toBe('optimal');
  });

  it('silence detection cambia con el noise floor: mismo dB puede ser silencio en un cuarto ruidoso', () => {
    // -55 dBFS in quiet room (-70): threshold = -64, -55 > -64 → not silence → too-low
    expect(classifyLoudness(-55, -70, config)).toBe('too-low');
    // -55 dBFS in moderately noisy room (-52): threshold = -46, -55 < -46 → silence
    expect(classifyLoudness(-55, -52, config)).toBe('silence');
  });
});
