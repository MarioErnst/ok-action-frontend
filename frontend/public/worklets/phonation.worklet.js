// public/worklets/phonation.worklet.js

// Importar funciones puras YIN
importScripts('./yin.js');
const { detectPitch, calculateDb } = globalThis.yinFunctions;

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

    // Acumular muestras en el ring buffer
    for (let i = 0; i < input.length; i++) {
      this._ringBuffer[this._ringBufferWriteIndex] = input[i];
      this._ringBufferWriteIndex = (this._ringBufferWriteIndex + 1) % YIN_BUFFER_SIZE;
    }
    this._ringBufferSamples += input.length;

    // Esperar hasta tener suficientes muestras para YIN
    if (this._ringBufferSamples < YIN_BUFFER_SIZE) return true;

    // Construir buffer lineal desde el ring buffer
    const buffer = new Float32Array(YIN_BUFFER_SIZE);
    let readIndex = this._ringBufferWriteIndex;
    for (let i = 0; i < YIN_BUFFER_SIZE; i++) {
      buffer[i] = this._ringBuffer[readIndex];
      readIndex = (readIndex + 1) % YIN_BUFFER_SIZE;
    }

    // Reiniciar contador para emitir a ~23 fps (2048 muestras / 48kHz)
    this._ringBufferSamples = 0;

    const rawDb = calculateDb(buffer, MIN_DB);
    const db = this._smoothedDb(rawDb);

    // Gatear detección de pitch: si dB está por debajo del noise floor + margen, no hay voz
    const hz = db > this._noiseFloor + NOISE_MARGIN
      ? detectPitch(buffer, sampleRate)
      : null;

    this.port.postMessage({ hz, db });

    return true;
  }

  /**
   * Suaviza el valor de dB usando una ventana deslizante.
   * El Hz no se suaviza — decisión de diseño: el pitch debe reflejar el valor
   * instantáneo para detectar quiebres de voz.
   * @param {number} rawDb
   * @returns {number}
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
