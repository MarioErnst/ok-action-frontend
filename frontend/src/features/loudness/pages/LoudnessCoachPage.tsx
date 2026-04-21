import { useState } from 'react';
import LoudnessCoachPanel from '../components/organisms/LoudnessCoachPanel';
import useLoudnessCoach from '../hooks/useLoudnessCoach';
import { LOUDNESS_PRESETS } from '../services/loudnessPresets';
import type { LoudnessConfig } from '../types';

export default function LoudnessCoachPage() {
  const [selectedConfig, setSelectedConfig] = useState<LoudnessConfig | null>(null);
  const coach = useLoudnessCoach(selectedConfig ?? LOUDNESS_PRESETS[0]);

  if (!selectedConfig) {
    return (
      <main className="min-h-screen bg-bg p-4 text-text md:p-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <header className="rounded-xl border border-border bg-surface p-5">
            <p className="m-0 text-sm text-text-muted">Loudness coach</p>
            <h1 className="m-0 mt-1 text-2xl font-semibold text-text">Selecciona un preset</h1>
            <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">
              Elige el contexto de uso para calibrar los umbrales de volumen antes de comenzar la sesión.
            </p>
          </header>

          <div className="grid gap-3 md:grid-cols-3">
            {LOUDNESS_PRESETS.map((preset) => (
              <button
                key={preset.presetId}
                type="button"
                onClick={() => setSelectedConfig(preset)}
                className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-alt"
              >
                <p className="m-0 text-lg font-semibold text-text group-hover:text-accent">{preset.label}</p>
                <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">{preset.description}</p>
                <p className="m-0 mt-4 text-xs uppercase tracking-[0.18em] text-text-muted">
                  {preset.minOffsetDb} - {preset.maxOffsetDb} dB sobre ruido
                </p>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg p-4 md:p-6">
      <LoudnessCoachPanel
        band={coach.band}
        db={coach.db}
        noiseFloor={coach.noiseFloor}
        config={selectedConfig}
        isCalibrating={coach.isCalibrating}
        isListening={coach.isListening}
        metrics={coach.metrics}
        onStart={coach.start}
        onStop={coach.stop}
      />
    </main>
  );
}