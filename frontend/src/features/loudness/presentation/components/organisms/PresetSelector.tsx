// Full module documentation: documentacion/modulos/volumen.md
import { ModuleGuideLauncher } from '../../../../journey';
import type { LoudnessPreset } from '../../../domain/LoudnessSession';

interface PresetSelectorProps {
  presets: LoudnessPreset[];
  onSelect(preset: LoudnessPreset): void;
}

// Each card is staggered by 100 ms to create a cascade entrance effect
// without requiring a CSS animation library.
export default function PresetSelector({ presets, onSelect }: PresetSelectorProps) {
  return (
    <div className="flex flex-col gap-6 relative z-10 w-full max-w-4xl mx-auto">
      <div className="grid gap-4 md:grid-cols-3">
          {presets.map((preset, i) => (
            <button
              key={preset.presetId}
              type="button"
              onClick={() => onSelect(preset)}
              style={{ animationDelay: `${i * 100}ms` }}
              className="group relative rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-6 text-left transition-all duration-300 hover:border-accent/60 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] active:scale-95 animate-fade-in overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex flex-col h-full">
                <p className="m-0 text-xl font-bold text-text group-hover:text-accent transition-colors">
                  {preset.label}
                </p>
                <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted flex-1">
                  {preset.description}
                </p>
                <div className="mt-5 inline-flex items-start gap-2 bg-surface-alt/50 px-3 py-2 rounded-xl border border-white/5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-muted">
                    {preset.lowOffsetDb > 0 ? '+' : ''}{preset.lowOffsetDb} / +{preset.optimalOffsetDb} dB
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
    </div>
  );
}

