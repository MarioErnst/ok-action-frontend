// Full module documentation: documentacion/modulos/volumen.md
import type { LoudnessPreset } from '../../../domain/LoudnessSession';

interface PresetSelectorProps {
  presets: LoudnessPreset[];
  onSelect(preset: LoudnessPreset): void;
}

// Each card is staggered by 100 ms to create a cascade entrance effect
// without requiring a CSS animation library.
export default function PresetSelector({ presets, onSelect }: PresetSelectorProps) {
  return (
    <main className="flex-1 flex flex-col justify-center p-4 md:p-6 pb-28 lg:pb-6 animate-fade-in relative z-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden text-center md:text-left">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none animate-pulse-glow" />
          <p className="m-0 text-xs font-bold uppercase tracking-widest text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            Loudness coach
          </p>
          <h1 className="m-0 mt-2 text-3xl font-extrabold text-text">Selecciona un preset</h1>
          <p className="m-0 mt-3 text-sm md:text-base leading-relaxed text-text-muted">
            Elige el contexto de uso para calibrar los umbrales de volumen antes de comenzar la sesión.
          </p>
        </header>

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
                <div className="mt-5 inline-flex items-center gap-2 bg-surface-alt/50 px-3 py-2 rounded-xl border border-white/5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-muted">
                    {preset.tooLowOffsetDb > 0 ? '+' : ''}{preset.tooLowOffsetDb} / +{preset.optimalOffsetDb} dB
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
