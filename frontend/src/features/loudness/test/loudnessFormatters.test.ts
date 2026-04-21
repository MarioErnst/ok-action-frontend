import { describe, expect, it } from 'vitest';
import { formatDuration, formatSeconds } from '../services/loudnessFormatters';

describe('formatDuration', () => {
  it('formatea 0 ms como 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formatea valores negativos como 00:00', () => {
    expect(formatDuration(-500)).toBe('00:00');
  });

  it('formatea menos de un minuto correctamente', () => {
    expect(formatDuration(5000)).toBe('00:05');
    expect(formatDuration(30000)).toBe('00:30');
    expect(formatDuration(59000)).toBe('00:59');
  });

  it('formatea exactamente un minuto como 01:00', () => {
    expect(formatDuration(60000)).toBe('01:00');
  });

  it('formatea varios minutos correctamente', () => {
    expect(formatDuration(90000)).toBe('01:30');
    expect(formatDuration(125000)).toBe('02:05');
    expect(formatDuration(3600000)).toBe('60:00');
  });

  it('redondea al segundo más cercano', () => {
    expect(formatDuration(1499)).toBe('00:01');
    expect(formatDuration(1500)).toBe('00:02');
  });
});

describe('formatSeconds', () => {
  it('formatea 0 ms como 0.0 s', () => {
    expect(formatSeconds(0)).toBe('0.0 s');
  });

  it('formatea valores negativos como 0.0 s', () => {
    expect(formatSeconds(-1000)).toBe('0.0 s');
  });

  it('formatea un segundo exacto', () => {
    expect(formatSeconds(1000)).toBe('1.0 s');
  });

  it('formatea con un decimal', () => {
    expect(formatSeconds(1500)).toBe('1.5 s');
    expect(formatSeconds(2300)).toBe('2.3 s');
    expect(formatSeconds(10000)).toBe('10.0 s');
  });

  it('trunca (no redondea al alza) el segundo decimal', () => {
    expect(formatSeconds(1050)).toBe('1.1 s');
    expect(formatSeconds(1090)).toBe('1.1 s');
  });
});
