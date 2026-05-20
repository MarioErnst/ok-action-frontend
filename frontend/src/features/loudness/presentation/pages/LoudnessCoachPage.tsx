// Full module documentation: documentacion/modulos/volumen.md
import { useEffect, useState } from 'react';
import { useVoiceMonitor } from '../../../phonation/index';
import LoudnessCoachPanel from '../components/organisms/LoudnessCoachPanel';
import PresetSelector from '../components/organisms/PresetSelector';
import useLoudnessCoach from '../hooks/useLoudnessCoach';
import { LOUDNESS_PRESETS } from '../../services/loudnessPresets';
import { ModuleGuideLauncher } from '../../../journey';
import { HttpLoudnessRepository } from '../../infrastructure/repositories/HttpLoudnessRepository';
import { toLoudnessPreset } from '../../infrastructure/mappers/loudnessMapper';
import type { LoudnessPreset } from '../../domain/LoudnessSession';

export default function LoudnessCoachPage() {
  const [selectedPreset, setSelectedPreset] = useState<LoudnessPreset | null>(null);
  const [presets, setPresets] = useState<LoudnessPreset[]>(LOUDNESS_PRESETS);
  // useVoiceMonitor is created here and injected into useLoudnessCoach so the
  // hook layer (useLoudnessCoach) stays decoupled from the phonation feature.
  const voiceMonitor = useVoiceMonitor();
  const coach = useLoudnessCoach(selectedPreset ?? presets[0], voiceMonitor);

  useEffect(() => {
    HttpLoudnessRepository.listPresets()
      .then((dtos) => {
        const dtoArray = Array.isArray(dtos) ? dtos : ((dtos as any)?.data || (dtos as any)?.items || []);
        const mapped = dtoArray.map(toLoudnessPreset);
        if (mapped.length > 0) {
          setPresets(mapped);
        }
      })
      .catch((err) => {
        console.error('Error loading presets, using defaults:', err);
      });
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="loudness-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Volumen</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Calibra y controla la intensidad de tu voz.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="loudness" />
          </div>
        </div>
      </header>
      
      {!selectedPreset ? (
        <PresetSelector presets={presets} onSelect={setSelectedPreset} />
      ) : (
        <main className="flex-1 flex flex-col justify-start mt-4">
          <LoudnessCoachPanel
            band={coach.band}
            db={coach.db}
            noiseFloor={coach.noiseFloor}
            preset={selectedPreset}
            effectiveConfig={coach.effectiveConfig}
            calibrationPhase={coach.calibrationPhase}
            metrics={coach.metrics}
            onStart={coach.start}
            onStop={coach.stop}
          />
        </main>
      )}
    </div>
  );
}