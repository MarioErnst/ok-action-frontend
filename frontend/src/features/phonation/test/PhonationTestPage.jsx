// src/features/phonation/test/PhonationTestPage.jsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { PhonationDisplay, useVoiceMonitor } from '../index';

/**
 * Pantalla de prueba manual para validar fonacion en tiempo real.
 */
export default function PhonationTestPage() {
  const { hz, db, isListening, isCalibrating, frames, start, stop } = useVoiceMonitor();

  const oscillatorCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const oscillatorWorkletRef = useRef(null);

  const [syntheticFreq, setSyntheticFreq] = useState(220);
  const [syntheticHz, setSyntheticHz] = useState(null);
  const [isSyntheticRunning, setIsSyntheticRunning] = useState(false);
  const [logCutoffTimestamp, setLogCutoffTimestamp] = useState(0);

  const visibleFrames = useMemo(() => {
    return [...frames]
      .filter((frame) => frame.timestamp >= logCutoffTimestamp)
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
      try {
        oscillatorRef.current.stop();
      } catch (error) {
        // Ignorar si el oscilador ya fue detenido.
      }

      try {
        oscillatorRef.current.disconnect();
      } catch (error) {
        // Ignorar para mantener el cleanup idempotente.
      }
    }

    if (oscillatorWorkletRef.current) {
      try {
        oscillatorWorkletRef.current.disconnect();
      } catch (error) {
        // Ignorar para mantener el cleanup idempotente.
      }
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

      workletNode.port.onmessage = (event) => {
        setSyntheticHz(event.data?.hz ?? null);
      };

      const oscillator = new OscillatorNode(ctx, {
        type: 'sine',
        frequency: syntheticFreq,
      });
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
    return () => {
      void stopSynthetic();
    };
  }, []);

  if (import.meta.env.PROD) {
    return <p style={{ color: '#9CA3AF' }}>Pagina no disponible en produccion</p>;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        color: '#F8FAFC',
        padding: 16,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header
          style={{
            background: '#1C1C1E',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h1 style={{ margin: 0, color: '#F59E0B' }}>OK Action - Prueba de Fonacion</h1>
          <p style={{ margin: '8px 0 0 0', color: '#9CA3AF' }}>
            Visualiza tono e intensidad en tiempo real usando el microfono del dispositivo.
          </p>
        </header>

        <section
          style={{
            background: '#1C1C1E',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: '#F59E0B' }}>Microfono real</h2>
          <PhonationDisplay
            hz={hz}
            db={db}
            isListening={isListening}
            isCalibrating={isCalibrating}
            frames={frames}
            onStart={start}
            onStop={stop}
          />
          <p style={{ marginTop: 12, color: '#9CA3AF', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            hz: {hz == null ? 'null' : hz.toFixed(2)} | db: {db.toFixed(2)} | frames: {frames.length} |
            calibrando: {String(isCalibrating)}
          </p>
        </section>

        <section
          style={{
            background: '#1C1C1E',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: '#F59E0B' }}>Oscilador sintetico</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <label style={{ color: '#9CA3AF' }} htmlFor="synthetic-frequency-input">
              Frecuencia objetivo (Hz)
            </label>
            <input
              id="synthetic-frequency-input"
              type="number"
              min={75}
              max={400}
              value={syntheticFreq}
              onChange={(event) => setSyntheticFreq(Number(event.target.value))}
              disabled={isSyntheticRunning}
              style={{
                width: 120,
                background: '#232B38',
                border: '1px solid #334155',
                color: '#F8FAFC',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            />
            {!isSyntheticRunning && (
              <button
                type="button"
                onClick={startSynthetic}
                style={{
                  background: '#F59E0B',
                  border: '1px solid #F59E0B',
                  color: '#0A0A0A',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 700,
                }}
              >
                Ingresar
              </button>
            )}
            {isSyntheticRunning && (
              <button
                type="button"
                onClick={() => void stopSynthetic()}
                style={{
                  background: '#1C1C1E',
                  border: '1px solid #334155',
                  color: '#9CA3AF',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 700,
                }}
              >
                Detener
              </button>
            )}
          </div>
          <p style={{ color: '#9CA3AF', marginBottom: 0 }}>
            Esperado: {syntheticFreq} Hz - Detectado: {syntheticHz == null ? '—' : syntheticHz.toFixed(2)} Hz
          </p>
          <p style={{ color: isSyntheticAccurate ? '#22c55e' : '#F59E0B', marginTop: 8, fontWeight: 700 }}>
            {syntheticHz == null ? 'Esperando medicion...' : isSyntheticAccurate ? '✓ dentro de tolerancia' : '✗ fuera de tolerancia'}
          </p>
        </section>

        <section
          style={{
            background: '#1C1C1E',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, color: '#F59E0B' }}>Log de frames</h2>
            <button
              type="button"
              onClick={() => setLogCutoffTimestamp(Date.now())}
              style={{
                background: '#1C1C1E',
                border: '1px solid #334155',
                color: '#9CA3AF',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 700,
              }}
            >
              Limpiar log
            </button>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={tableHeadCellStyle}>#</th>
                  <th style={tableHeadCellStyle}>Timestamp</th>
                  <th style={tableHeadCellStyle}>Hz</th>
                  <th style={tableHeadCellStyle}>dB</th>
                  <th style={tableHeadCellStyle}>Alerta</th>
                </tr>
              </thead>
              <tbody>
                {visibleFrames.map((frame, index) => {
                  const time = new Date(frame.timestamp);
                  const timestamp = `${time.toLocaleTimeString()}.${String(time.getMilliseconds()).padStart(3, '0')}`;

                  return (
                    <tr key={`${frame.timestamp}-${index}`}>
                      <td style={tableBodyCellStyle}>{index + 1}</td>
                      <td style={tableBodyCellStyle}>{timestamp}</td>
                      <td style={tableBodyCellStyle}>{frame.hz == null ? '—' : frame.hz.toFixed(1)}</td>
                      <td style={tableBodyCellStyle}>{frame.db.toFixed(1)}</td>
                      <td style={tableBodyCellStyle}>{frame.hz == null ? 'si' : 'no'}</td>
                    </tr>
                  );
                })}
                {visibleFrames.length === 0 && (
                  <tr>
                    <td style={tableBodyCellStyle} colSpan={5}>
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

const tableHeadCellStyle = {
  borderBottom: '1px solid #334155',
  color: '#9CA3AF',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  padding: '8px 6px',
};

const tableBodyCellStyle = {
  borderBottom: '1px solid #232B38',
  color: '#F8FAFC',
  fontSize: 13,
  padding: '8px 6px',
};
