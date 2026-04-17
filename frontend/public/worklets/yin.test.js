// Tests para las funciones puras del algoritmo YIN.
// Ejecutar con: node public/worklets/yin.test.js

require('./yin.js');
const { difference, cumulativeMeanNormalizedDifference, detectPitch, calculateDb } = globalThis.yinFunctions;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function approx(a, b, tolerance = 1) {
  return Math.abs(a - b) <= tolerance;
}

// --- difference ---

console.log('difference()');

(() => {
  const silence = new Float32Array(128);
  const d = difference(silence);
  assert(d[0] === 0, 'd(0) should be 0');
  assert(d.every((v) => v === 0), 'silence should produce all-zero difference');
})();

(() => {
  const buf = new Float32Array(128);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.sin(2 * Math.PI * i / 32);
  const d = difference(buf);
  assert(d[0] === 0, 'd(0) = 0 for sine');
  assert(d.length === 65, 'length should be buffer.length / 2 + 1');
  // d(tau=32) should be near 0 (period match)
  assert(d[32] < d[16], 'd(period) should be smaller than d(half-period)');
})();

// --- cumulativeMeanNormalizedDifference ---

console.log('cumulativeMeanNormalizedDifference()');

(() => {
  const d = new Float32Array([0, 10, 5, 15, 3]);
  const dPrime = cumulativeMeanNormalizedDifference(d);
  assert(dPrime[0] === 1, "d'(0) should be 1");
  assert(dPrime[1] === 1, "d'(1) = d(1) / (d(1)/1) = 1");
  // d'(2) = 5 / ((10+5)/2) = 5/7.5 = 0.666...
  assert(approx(dPrime[2], 0.667, 0.01), "d'(2) should be ~0.667");
})();

// --- detectPitch ---

console.log('detectPitch()');

(() => {
  const sampleRate = 48000;
  const freq = 220; // A3
  const len = 2048;
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  const hz = detectPitch(buf, sampleRate);
  assert(hz !== null, 'should detect 220 Hz sine');
  assert(approx(hz, freq, 4), `detected ${hz?.toFixed(1)} Hz should be ~220 Hz`);
})();

(() => {
  const sampleRate = 48000;
  const freq = 150;
  const len = 2048;
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
  const hz = detectPitch(buf, sampleRate);
  assert(hz !== null, 'should detect 150 Hz sine');
  assert(approx(hz, freq, 2), `detected ${hz?.toFixed(1)} Hz should be ~150 Hz`);
})();

(() => {
  const silence = new Float32Array(2048);
  const hz = detectPitch(silence, 48000);
  assert(hz === null, 'silence should return null');
})();

(() => {
  // Frequency out of range (50 Hz < MIN_HZ)
  const sampleRate = 48000;
  const buf = new Float32Array(2048);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.sin(2 * Math.PI * 50 * i / sampleRate);
  const hz = detectPitch(buf, sampleRate);
  assert(hz === null, '50 Hz should be rejected (below MIN_HZ)');
})();

// --- calculateDb ---

console.log('calculateDb()');

(() => {
  const silence = new Float32Array(128);
  assert(calculateDb(silence, -100) === -100, 'silence should return MIN_DB');
})();

(() => {
  // Full-scale sine: RMS = 1/sqrt(2) ≈ 0.707, dB ≈ -3.01
  const buf = new Float32Array(4096);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.sin(2 * Math.PI * i / 64);
  const db = calculateDb(buf, -100);
  assert(approx(db, -3.01, 0.1), `full-scale sine dB should be ~-3.01, got ${db.toFixed(2)}`);
})();

// --- Summary ---

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
