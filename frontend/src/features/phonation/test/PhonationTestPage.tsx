import { useEffect, useMemo, useRef, useState } from 'react';
import { PhonationDisplay, useVoiceMonitor } from '../index';
import type { PhonationFrame } from '../domain/PhonationSession';

export default function PhonationTestPage() {
  const { hz, db, isListening, isCalibrating, frames, start, stop } = useVoiceMonitor();

  const oscillatorCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillatorWorkletRef = useRef<AudioWorkletNode | null>(null);

  const [syntheticFreq, setSyntheticFreq] = useState(220);
  const [syntheticHz, setSyntheticHz] = useState<number | null>(null);
  const [isSyntheticRunning, setIsSyntheticRunning] = useState(false);
  const [logCutoffTimestamp, setLogCutoffTimestamp] = useState(0);

  const visibleFrames = useMemo(() => {
    return [...frames]
      .filter((frame: PhonationFrame) => frame.timestamp >= logCutoffTimestamp)
      .reverse()
      .slice(0, 20);
  }, [frames, logCutoffTimestamp]);

  const frequencyDelta = useMemo(() => {
    if (typeof syntheticHz !== 'number') return null;
    return Math.abs(syntheticFreq - syntheticHz);
  }, [syntheticFreq, syntheticHz]);

  const isSyntheticAccurate = typeof frequencyDelta === 'number' && frequencyDelta <= 2;

  const stopSynthetic = async () => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch { /* already stopped */ }
      try { oscillatorRef.current.disconnect(); } catch { /* idempotent */ }
    }
    if (oscillatorWorkletRef.current) {
      try { oscillatorWorkletRef.current.disconnect(); } catch { /* idempotent */ }
    }
    if (oscillatorCtxRef.current && oscillatorCtxRef.current.state !== 'closed') {
      await oscillatorCtxRef.current.close();
    }
    oscillatorCtxRef.current = null;
    oscillatorRef.current = null;
    oscillatorWorkletRef.current = null;
    setSyntheticHz(null);
    setIsSyntheticRunning(false);
  };

  const startSynthetic = async () => {
    if (isSyntheticRunning) return;
    try {
      const ctx = new AudioContext();
      oscillatorCtxRef.current = ctx;
      await ctx.audioWorklet.addModule('/worklets/phonation.worklet.js');
      const workletNode = new AudioWorkletNode(ctx, 'phonation-processor');
      oscillatorWorkletRef.current = workletNode;
      workletNode.port.onmessage = (event: MessageEvent<{ hz: number | null }>) => {
        setSyntheticHz(event.data?.hz ?? null);
      };
      const oscillator = new OscillatorNode(ctx, { type: 'sine', frequency: syntheticFreq });
      oscillatorRef.current = oscillator;
      oscillator.connect(workletNode);
      oscillator.start();
      setIsSyntheticRunning(true);
    } catch (error) {
      console.error('PhonationTestPage.startSynthetic failed:', error);
      await stopSynthetic();
    }
  };

  useEffect(() => {
    return () => { void stopSynthetic(); };
  }, []);

  if (import.meta.env.PROD) {
    return <p className="text-text-muted">Pagina no disponible en produccion</p>;
  }

  return (
    <main className="min-h-screen bg-bg p-4 font-sans text-text">
      <div className="mx-auto grid max-w-[900px] gap-4">

        <header className="rounded-xl border border-border bg-surface p-4">
          <h1 className="m-0 text-accent">OK Action - Prueba de Fonacion</h1>
          <p className="mt-2 text-text-muted">
            Visualiza tono e intensidad en tiempo real usando el microfono del dispositivo.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mt-0 text-accent">Microfono real</h2>
          <PhonationDisplay
            hz={hz}
            db={db}
            isListening={isListening}
            isCalibrating={isCalibrating}
            frames={frames}
            onStart={start}
            onStop={stop}
          />
          <p className="mt-3 font-mono text-sm text-text-muted">
            hz: {hz == null ? 'null' : hz.toFixed(2)} | db: {db.toFixed(2)} | frames: {frames.length} |
            calibrando: {String(isCalibrating)}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mt-0 text-accent">Oscilador sintetico</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="text-text-muted" htmlFor="synthetic-frequency-input">
              Frecuencia objetivo (Hz)
            </label>
            <input
              id="synthetic-frequency-input"
              type="number"
              min={75}
              max={400}
              value={syntheticFreq}
              onChange={(e) => setSyntheticFreq(Number(e.target.value))}
              disabled={isSyntheticRunning}
              className="w-[120px] rounded-lg border border-border bg-surface-alt px-2.5 py-2 text-text"
            />
            {!isSyntheticRunning && (
              <button
                type="button"
                onClick={startSynthetic}
                className="rounded-lg border border-accent bg-accent px-3 py-2 font-bold text-bg"
              >
                Ingresar
              </button>
            )}
            {isSyntheticRunning && (
              <button
                type="button"
                onClick={() => void stopSynthetic()}
                className="rounded-lg border border-border bg-surface px-3 py-2 font-bold text-text-muted"
              >
                Detener
              </button>
            )}
          </div>
          <p className="mb-0 text-text-muted">
            Esperado: {syntheticFreq} Hz - Detectado: {syntheticHz == null ? '—' : syntheticHz.toFixed(2)} Hz
          </p>
          <p className={`mt-2 font-bold ${isSyntheticAccurate ? 'text-success' : 'text-accent'}`}>
            {syntheticHz == null
              ? 'Esperando medicion...'
              : isSyntheticAccurate
                ? '✓ dentro de tolerancia'
                : '✗ fuera de tolerancia'}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="m-0 text-accent">Log de frames</h2>
            <button
              type="button"
              onClick={() => setLogCutoffTimestamp(Date.now())}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-bold text-text-muted"
            >
              Limpiar log
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  {['#', 'Timestamp', 'Hz', 'dB', 'Alerta'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-border px-1.5 py-2 text-left text-xs uppercase tracking-wide text-text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleFrames.map((frame, index) => {
                  const time = new Date(frame.timestamp);
                  const ts = `${time.toLocaleTimeString()}.${String(time.getMilliseconds()).padStart(3, '0')}`;
                  return (
                    <tr key={`${frame.timestamp}-${index}`}>
                      <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text">{index + 1}</td>
                      <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text">{ts}</td>
                      <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text">{frame.hz == null ? '—' : frame.hz.toFixed(1)}</td>
                      <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text">{frame.db.toFixed(1)}</td>
                      <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text">{frame.hz == null ? 'si' : 'no'}</td>
                    </tr>
                  );
                })}
                {visibleFrames.length === 0 && (
                  <tr>
                    <td className="border-b border-surface-alt px-1.5 py-2 text-[13px] text-text" colSpan={5}>
                      Sin datos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
