// public/worklets/phonation.worklet.js

// --- Funciones puras YIN (duplicadas de yin.js para AudioWorkletGlobalScope) ---

const YIN_THRESHOLD = 0.10;
const MIN_HZ = 75;
const MAX_HZ = 400;

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

function detectPitch(buffer, sr) {
  const d = difference(buffer);
  const dPrime = cumulativeMeanNormalizedDifference(d);

  let tau = 1;
  while (tau < dPrime.length) {
    if (dPrime[tau] < YIN_THRESHOLD) break;
    tau++;
  }
  if (tau === dPrime.length || tau === 1) return null;

  if (tau + 1 < dPrime.length && tau - 1 > 0) {
    const prev = dPrime[tau - 1];
    const next = dPrime[tau + 1];
    const center = dPrime[tau];
    const denominator = 2 * (prev - 2 * center + next);
    if (denominator !== 0) {
      tau = tau + (prev - next) / denominator;
    }
  }

  const hz = sr / tau;
  if (hz < MIN_HZ || hz > MAX_HZ) return null;
  return hz;
}

function calculateDb(buffer, minDb) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  if (rms === 0) return minDb;
  return 20 * Math.log10(rms);
}

// --- Processor ---

const SMOOTHING_WINDOW = 7;
const MIN_DB = -100;
const YIN_BUFFER_SIZE = 2048;
const NOISE_MARGIN = 6;

class PhonationProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._noiseFloor = MIN_DB;
    this._dbHistory = [];
    this._ringBuffer = new Float32Array(YIN_BUFFER_SIZE);
    this._ringBufferWriteIndex = 0;
    this._ringBufferSamples = 0;

    this.port.onmessage = (event) => {
      if (event.data && typeof event.data.noiseFloor === 'number') {
        this._noiseFloor = event.data.noiseFloor;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this._ringBuffer[this._ringBufferWriteIndex] = input[i];
      this._ringBufferWriteIndex = (this._ringBufferWriteIndex + 1) % YIN_BUFFER_SIZE;
    }
    this._ringBufferSamples += input.length;

    if (this._ringBufferSamples < YIN_BUFFER_SIZE) return true;

    const buffer = new Float32Array(YIN_BUFFER_SIZE);
    let readIndex = this._ringBufferWriteIndex;
    for (let i = 0; i < YIN_BUFFER_SIZE; i++) {
      buffer[i] = this._ringBuffer[readIndex];
      readIndex = (readIndex + 1) % YIN_BUFFER_SIZE;
    }

    this._ringBufferSamples = 0;

    const rawDb = calculateDb(buffer, MIN_DB);
    const db = this._smoothedDb(rawDb);

    const hz = db > this._noiseFloor + NOISE_MARGIN
      ? detectPitch(buffer, sampleRate)
      : null;

    this.port.postMessage({ hz, db });

    return true;
  }

  /**
   * Suaviza dB con ventana deslizante.
   * Hz no se suaviza — el pitch debe reflejar el valor instantáneo
   * para detectar quiebres de voz.
   */
  _smoothedDb(rawDb) {
    this._dbHistory.push(rawDb);
    if (this._dbHistory.length > SMOOTHING_WINDOW) {
      this._dbHistory.shift();
    }
    const sum = this._dbHistory.reduce((a, b) => a + b, 0);
    return sum / this._dbHistory.length;
  }
}

registerProcessor('phonation-processor', PhonationProcessor);
