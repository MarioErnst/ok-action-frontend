// Constante para ventana de suavizado de dB
const SMOOTHING_WINDOW = 7;
// Constante para dB mínimo
const MIN_DB = -100;
// Constantes YIN para la detección de pitch
const YIN_THRESHOLD = 0.10;
const MIN_HZ = 75;
const MAX_HZ = 400;
// public/worklets/phonation.worklet.js

/*
Clase PhonationProcessor que extiende AudioWorkletProcessor.
Método process(inputs, outputs, parameters) vacío que devuelve true.
Constructor con this.port.onmessage vacío.
registerProcessor('phonation-processor', PhonationProcessor) al final.
Todo el código comentado.
*/


class PhonationProcessor extends AudioWorkletProcessor {

			/**
			 * Detecta el pitch fundamental usando el algoritmo YIN con interpolación parabólica.
			 * @param {Float32Array} buffer
			 * @param {number} sampleRate
			 * @returns {number|null} hz
			 */
			_detectPitch(buffer, sampleRate) {
				const d = this._difference(buffer);
				const dPrime = this._cumulativeMeanNormalizedDifference(d);
				// Buscar el primer tau donde d'(tau) < YIN_THRESHOLD
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
		 * Calcula la función de diferencia acumulada normalizada YIN d'(τ).
		 * d'(0) = 1
		 * d'(τ) = d(τ) / [(1/τ) * Σ d(j)]  para j = 1..τ
		 * @param {Float32Array} d
		 * @returns {Float32Array} dPrime
		 */
		_cumulativeMeanNormalizedDifference(d) {
			const dPrime = new Float32Array(d.length);
			dPrime[0] = 1;
			let cumulativeSum = 0;
			for (let tau = 1; tau < d.length; tau++) {
				cumulativeSum += d[tau];
				dPrime[tau] = d[tau] / (cumulativeSum / tau);
			}
			return dPrime;
		}
	constructor() {
		super();
		this._noiseFloor = MIN_DB;
		this.port.onmessage = (event) => {
			// Si el mensaje contiene { noiseFloor }, actualizar this._noiseFloor
			if (event.data && typeof event.data.noiseFloor === 'number') {
				this._noiseFloor = event.data.noiseFloor;
			}
		};
		this._dbHistory = [];
	}

	/**
	 * Suaviza el valor de dB usando una ventana deslizante de 7 frames.
	 * El Hz no se suaviza (decisión explícita).
	 * @param {number} rawDb
	 * @returns {number} dB suavizado
	 */
	_smoothedDb(rawDb) {
		this._dbHistory.push(rawDb);
		if (this._dbHistory.length > SMOOTHING_WINDOW) {
			this._dbHistory.shift();
		}
		const sum = this._dbHistory.reduce((a, b) => a + b, 0);
		return sum / this._dbHistory.length;
	}

	/**
	 * Calcula el RMS y lo convierte a dBFS.
	 * Si rms === 0, devuelve MIN_DB
	 * @param {Float32Array} buffer
	 * @returns {number} dB
	 */
	_calculateDb(buffer) {
		let sum = 0;
		for (let i = 0; i < buffer.length; i++) {
			sum += buffer[i] * buffer[i];
		}
		const rms = Math.sqrt(sum / buffer.length);
		if (rms === 0) return MIN_DB;
		return 20 * Math.log10(rms);
	}

	/**
	 * Calcula la función de diferencia YIN d(τ) para un buffer de audio.
	 * d(τ) = Σ (x[j] - x[j+τ])²  para j = 0..W
	 * τ va de 0 a buffer.length / 2
	 * d(0) = 0 por definición
	 * @param {Float32Array} buffer
	 * @returns {Float32Array} d
	 */
	_difference(buffer) {
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

	process(inputs, outputs, parameters) {
		// 1. Buffer = inputs[0][0]; si está vacío o undefined, devolver true
		const input = inputs[0] && inputs[0][0];
		if (!input) return true;

		// 2. hz = this._detectPitch(buffer, this.context.sampleRate)
		// Nota: AudioWorkletProcessor no tiene this.context, sampleRate es global
		const hz = this._detectPitch(input, sampleRate);

		// 3. rawDb = this._calculateDb(buffer)
		const rawDb = this._calculateDb(input);

		// 4. db = this._smoothedDb(rawDb)
		const db = this._smoothedDb(rawDb);

		// 5. this.port.postMessage({ hz, db })
		this.port.postMessage({ hz, db });

		// 6. return true
		return true;
	}
}
registerProcessor('phonation-processor', PhonationProcessor);
