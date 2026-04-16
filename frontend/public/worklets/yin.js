// public/worklets/yin.js
// Funciones puras del algoritmo YIN, extraídas para testabilidad.

const YIN_THRESHOLD = 0.10;
const MIN_HZ = 75;
const MAX_HZ = 400;

/**
 * Calcula la función de diferencia YIN d(τ) para un buffer de audio.
 * d(τ) = Σ (x[j] - x[j+τ])²  para j = 0..W
 * d(0) = 0 por definición
 * @param {Float32Array} buffer
 * @returns {Float32Array}
 */
function difference(buffer) {
  const W = Math.floor(buffer.length / 2);
  const d = new Float32Array(W + 1);
  d[0] = 0;
  for (let tau = 1; tau <= W; tau++) {
    let sum = 0;
    for (let j = 0; j < W; j++) {
      const diff = buffer[j] - buffer[j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  return d;
}

/**
 * Calcula la función de diferencia acumulada normalizada YIN d'(τ).
 * d'(0) = 1
 * d'(τ) = d(τ) / [(1/τ) * Σ d(j)]  para j = 1..τ
 * @param {Float32Array} d
 * @returns {Float32Array}
 */
function cumulativeMeanNormalizedDifference(d) {
  const dPrime = new Float32Array(d.length);
  dPrime[0] = 1;
  let cumulativeSum = 0;
  for (let tau = 1; tau < d.length; tau++) {
    cumulativeSum += d[tau];
    dPrime[tau] = d[tau] / (cumulativeSum / tau);
  }
  return dPrime;
}

/**
 * Detecta el pitch fundamental usando el algoritmo YIN con interpolación parabólica.
 * @param {Float32Array} buffer
 * @param {number} sampleRate
 * @returns {number|null} hz
 */
function detectPitch(buffer, sampleRate) {
  const d = difference(buffer);
  const dPrime = cumulativeMeanNormalizedDifference(d);

  let tau = 1;
  while (tau < dPrime.length) {
    if (dPrime[tau] < YIN_THRESHOLD) break;
    tau++;
  }
  if (tau === dPrime.length || tau === 1) {
    return null;
  }

  // Interpolación parabólica para refinar tau
  if (tau + 1 < dPrime.length && tau - 1 > 0) {
    const prev = dPrime[tau - 1];
    const next = dPrime[tau + 1];
    const center = dPrime[tau];
    const denominator = 2 * (prev - 2 * center + next);
    if (denominator !== 0) {
      tau = tau + (prev - next) / denominator;
    }
  }

  const hz = sampleRate / tau;
  if (hz < MIN_HZ || hz > MAX_HZ) {
    return null;
  }
  return hz;
}

/**
 * Calcula el RMS de un buffer y lo convierte a dBFS.
 * @param {Float32Array} buffer
 * @param {number} minDb - valor mínimo de dB a retornar cuando rms === 0
 * @returns {number}
 */
function calculateDb(buffer, minDb) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  if (rms === 0) return minDb;
  return 20 * Math.log10(rms);
}

// En worklets no hay módulos ES, usar asignación global para compartir.
// En tests (Node/Vitest), se importa con require/import.
if (typeof globalThis !== 'undefined') {
  globalThis.yinFunctions = { difference, cumulativeMeanNormalizedDifference, detectPitch, calculateDb };
}
