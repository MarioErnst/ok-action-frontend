import type { LoudnessStopReason } from '../../hooks/useLiveLoudness'
import type { PhonationStopReason } from '../../hooks/useLivePhonation'
import type { StopCategory } from '../../hooks/useLiveSession'

interface StoppedTransitionOverlayProps {
  // Which counter triggered the auto-stop. Drives the per-category
  // detail line under the headline. Null/undefined means we do not
  // know which specific counter fired (treated as a generic stop).
  category: StopCategory | null
  // Human-readable emotion fragment ("enojo", "tristeza", ...) used
  // when category === 'emotion'. Ignored otherwise.
  emotionLabel?: string
  // Sub-reason for the loudness corten ('clipping' | 'too_high').
  // Used to pick between "saturado" vs "demasiado alto" copy.
  // Ignored when category !== 'loudness'.
  loudnessReason?: LoudnessStopReason | null
  // Sub-reason for the phonation corten ('high_pitch' | 'breaks').
  // Used to pick between "voz aguda" vs "saltos de frecuencia" copy.
  // Ignored when category !== 'phonation'.
  phonationReason?: PhonationStopReason | null
}

// Brief five-second backdrop that fades in over the recording screen
// when the auto-stop fires. The board-shaped icon and the "¡CORTEN!"
// shout are a deliberate cinematic cue: the system is "calling cut"
// because it detected something worth pausing on. The detail line
// below ("dos errores de pronunciación", "expresión de enojo", etc.)
// gives the user a one-line reason while the dense feedback page
// loads underneath.
export const StoppedTransitionOverlay = ({
  category,
  emotionLabel,
  loudnessReason,
  phonationReason,
}: StoppedTransitionOverlayProps) => {
  const detail = pickDetailCopy(
    category,
    emotionLabel,
    loudnessReason,
    phonationReason,
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/85 backdrop-blur-md animate-fade-in px-6 text-center">
      <div className="flex items-center justify-center mb-6">
        <div className="h-20 w-20 rounded-2xl border-2 border-accent/40 bg-accent/10 flex items-center justify-center animate-scale-in">
          <ClapperboardIcon className="h-12 w-12 text-accent drop-shadow-[0_0_12px_rgba(245,158,11,0.55)]" />
        </div>
      </div>
      <p className="text-3xl sm:text-4xl font-extrabold tracking-widest text-accent drop-shadow-[0_0_14px_rgba(245,158,11,0.45)]">
        ¡CORTEN!
      </p>
      <h1 className="mt-3 text-xl sm:text-2xl font-bold text-text">
        Tu sesión fue detenida
      </h1>
      <p className="text-sm sm:text-base text-text-muted mt-3 max-w-md">{detail}</p>
    </div>
  )
}

// One-line detail explaining which auto-stop fired. Live corten today
// covers muletillas, sustained emotion, loudness (clipping or sustained
// too-high) and phonation (sustained high pitch or repeated pitch
// breaks). Pronunciation and accentuation moved to composed-eval at
// session end and do not show up here.
function pickDetailCopy(
  category: StopCategory | null,
  emotionLabel: string | undefined,
  loudnessReason: LoudnessStopReason | null | undefined,
  phonationReason: PhonationStopReason | null | undefined,
): string {
  if (category === 'muletillas') {
    return 'Apareció una muletilla en tu discurso.'
  }
  if (category === 'emotion') {
    return `Mantuviste una expresión de ${emotionLabel ?? 'malestar'} por demasiado tiempo.`
  }
  if (category === 'loudness') {
    if (loudnessReason === 'clipping') {
      return 'Tu voz se saturó: estuviste gritando muy cerca del micrófono.'
    }
    if (loudnessReason === 'too_high') {
      return 'Tu volumen se mantuvo demasiado alto por varios segundos.'
    }
    return 'Tu volumen se salió del rango óptimo por demasiado tiempo.'
  }
  if (category === 'phonation') {
    if (phonationReason === 'high_pitch') {
      return 'Tu voz subió por encima de tu tono normal y se mantuvo así.'
    }
    if (phonationReason === 'breaks') {
      return 'Detectamos varios saltos bruscos de frecuencia en tu voz.'
    }
    return 'Detectamos algo inusual en la frecuencia de tu voz.'
  }
  return 'Pausamos la sesión para que revises el detalle.'
}

interface IconProps {
  className?: string
}

// Inline clapperboard SVG: the body is a rounded rectangle and the
// hinged top piece sits above with three diagonal stripes evoking the
// classic black-and-white film slate. Stroke-based so it inherits
// currentColor and aligns with the rest of the icon system.
function ClapperboardIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* Body */}
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      {/* Top arm */}
      <path d="M3 9 L5 4 L21 4 L19 9 Z" />
      {/* Diagonal stripes on top arm */}
      <line x1="8.5" y1="4" x2="6.5" y2="9" />
      <line x1="13.5" y1="4" x2="11.5" y2="9" />
      <line x1="18.5" y1="4" x2="16.5" y2="9" />
      {/* Subtle body crease so the rectangle reads as a slate */}
      <line x1="3" y1="13" x2="21" y2="13" />
    </svg>
  )
}
