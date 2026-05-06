// Full module documentation: documentacion/modulos/volumen.md
import { useEffect, useState } from 'react';
import { useVoiceMonitor } from '../../phonation/index';
import LoudnessCoachPanel from '../components/organisms/LoudnessCoachPanel';
import PresetSelector from '../components/organisms/PresetSelector';
import useLoudnessCoach from '../hooks/useLoudnessCoach';
import { LOUDNESS_PRESETS } from '../services/loudnessPresets';
import { HttpLoudnessRepository } from '../infrastructure/repositories/HttpLoudnessRepository';
import { toLoudnessPreset } from '../infrastructure/mappers/loudnessMapper';
import type { LoudnessPreset } from '../types';

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
        const mapped = dtos.map(toLoudnessPreset);
        if (mapped.length > 0) {
          setPresets(mapped);
        }
      })
      .catch((err) => {
        console.error('Error loading presets, using defaults:', err);
      });
  }, []);

  if (!selectedPreset) {
    return <PresetSelector presets={presets} onSelect={setSelectedPreset} />;
  }

  return (
    <main className="flex-1 flex flex-col justify-center p-4 md:p-6 pb-28 lg:pb-6">
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
  );
}