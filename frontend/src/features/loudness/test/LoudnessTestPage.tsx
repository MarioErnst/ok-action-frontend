import { useState } from 'react';
import { useVoiceMonitor } from '../../phonation/index';
import LoudnessCoachPanel from '../presentation/components/organisms/LoudnessCoachPanel';
import useLoudnessCoach from '../hooks/useLoudnessCoach';
import { LOUDNESS_PRESETS } from '../services/loudnessPresets';

export default function LoudnessTestPage() {
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const voiceMonitor = useVoiceMonitor();
  const coach = useLoudnessCoach(LOUDNESS_PRESETS[activePresetIndex], voiceMonitor);

  if (import.meta.env.PROD) {
    return <p className="text-text-muted">Página no disponible en producción</p>;
  }

  return (
    <main className="min-h-screen bg-bg p-4 text-text md:p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-4">
          <header className="rounded-xl border border-border bg-surface p-5">
            <p className="m-0 text-sm text-text-muted">Loudness test</p>
            <h1 className="m-0 mt-1 text-2xl font-semibold text-text">Prueba manual del coach</h1>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            {LOUDNESS_PRESETS.map((preset, index) => (
              <button
                key={preset.presetId}
                type="button"
                onClick={() => setActivePresetIndex(index)}
                className={`rounded-xl border p-4 text-left transition-colors ${index === activePresetIndex ? 'border-accent bg-surface-alt' : 'border-border bg-surface hover:border-accent'}`}
              >
                <p className="m-0 font-semibold text-text">{preset.label}</p>
                <p className="m-0 mt-2 text-sm text-text-muted">{preset.description}</p>
              </button>
            ))}
          </div>

          <LoudnessCoachPanel
            band={coach.band}
            db={coach.db}
            noiseFloor={coach.noiseFloor}
            preset={LOUDNESS_PRESETS[activePresetIndex]}
            effectiveConfig={coach.effectiveConfig}
            calibrationPhase={coach.calibrationPhase}
            metrics={coach.metrics}
            onStart={coach.start}
            onStop={coach.stop}
          />
        </section>

        <aside className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="m-0 text-lg font-semibold text-text">Valores crudos</h2>
          <div className="space-y-2 text-sm text-text-muted">
            <p className="m-0">dB actual: {coach.db.toFixed(2)}</p>
            <p className="m-0">Noise floor: {coach.noiseFloor.toFixed(2)}</p>
            <p className="m-0">Banda: {coach.band}</p>
            <p className="m-0">Escuchando: {String(coach.isListening)}</p>
            <p className="m-0">Fase: {coach.calibrationPhase}</p>
          </div>

          <pre className="overflow-auto rounded-xl border border-border bg-bg p-3 text-xs text-text-muted">
{JSON.stringify(coach.metrics, null, 2)}
          </pre>
        </aside>
      </div>
    </main>
  );
}