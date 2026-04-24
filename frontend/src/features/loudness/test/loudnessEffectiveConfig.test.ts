import { describe, expect, it } from 'vitest';
import {
  computeEffectiveConfig,
  computeVoiceBaseline,
} from '../services/loudnessEffectiveConfig';
import type { LoudnessPreset } from '../types';

const preset: LoudnessPreset = {
  presetId: 'test',
  label: 'Test',
  description: 'Test preset',
  silenceOffsetDb: 6,
  tooLowOffsetDb: -8,
  optimalOffsetDb: 10,
  clipThresholdDbfs: -3,
};

describe('computeEffectiveConfig', () => {
  it('calcula tooLowCeilingDbfs como voiceBaseline + tooLowOffsetDb', () => {
    const config = computeEffectiveConfig(preset, -32);
    expect(config.tooLowCeilingDbfs).toBe(-40);
  });

  it('calcula optimalCeilingDbfs como voiceBaseline + optimalOffsetDb', () => {
    const config = computeEffectiveConfig(preset, -32);
    expect(config.optimalCeilingDbfs).toBe(-22);
  });

  it('copia campos de display desde el preset', () => {
    const config = computeEffectiveConfig(preset, -32);
    expect(config.presetId).toBe('test');
    expect(config.label).toBe('Test');
    expect(config.silenceOffsetDb).toBe(6);
    expect(config.clipThresholdDbfs).toBe(-3);
  });

  it('funciona con distintos baseline values', () => {
    const config = computeEffectiveConfig(preset, -20);
    expect(config.tooLowCeilingDbfs).toBe(-28);
    expect(config.optimalCeilingDbfs).toBe(-10);
  });
});

describe('computeVoiceBaseline', () => {
  const noiseFloor = -60;

  it('retorna null si no hay muestras', () => {
    expect(computeVoiceBaseline([], noiseFloor)).toBeNull();
  });

  it('filtra muestras por debajo de noiseFloor + 10 dB', () => {
    expect(computeVoiceBaseline([-55, -55, -55], noiseFloor)).toBeNull();
  });

  it('retorna la mediana de las muestras de voz válidas (impar)', () => {
    expect(computeVoiceBaseline([-49, -40, -45], noiseFloor)).toBe(-45);
  });

  it('retorna la mediana de las muestras de voz válidas (par)', () => {
    expect(computeVoiceBaseline([-48, -44], noiseFloor)).toBe(-46);
  });

  it('descarta silencio pero usa las muestras válidas restantes', () => {
    expect(computeVoiceBaseline([-55, -30, -32], noiseFloor)).toBe(-31);
  });
});