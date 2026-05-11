export type NavIconName =
  | 'dashboard'
  | 'phonation'
  | 'pronunciation'
  | 'accentuation'
  | 'loudness'
  | 'pauses'
  | 'muletillas'
  | 'precision'
  | 'live'
  | 'facial'
  | 'body'
  | 'lexical'
  | 'fluency'
  | 'consistency'

type NavIconProps = {
  name: NavIconName
  active: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

const PATHS: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  phonation: (
    <path d="M2 12 Q5 5 8 12 Q11 19 14 12 Q17 5 20 12 Q21.5 15.5 23 12" />
  ),
  pronunciation: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="11" r="1.5" fill="currentColor" strokeWidth={0} />
    </>
  ),
  accentuation: (
    <>
      <path d="M6 18L12 5L18 18" />
      <path d="M8.5 13.5h7" />
      <path d="M4 21h16" strokeWidth={1.25} />
    </>
  ),
  loudness: (
    <>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  pauses: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8v8" />
      <path d="M14 8v8" />
    </>
  ),
  // Burbuja de dialogo con puntos — representa palabras de relleno en el habla
  muletillas: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="9" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="15" y1="10" x2="15" y2="10" strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  // diana — represents precision in communication
  precision: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" strokeWidth={0} />
    </>
  ),
  // Libro abierto — representa riqueza y variedad léxica
  lexical: (
    <>
      <path d="M2 6 L12 8 L22 6 L22 19 L12 21 L2 19 Z" />
      <path d="M12 8 L12 21" />
      <path d="M5 9 L9 9.5" />
      <path d="M5 12 L9 12.5" />
      <path d="M5 15 L9 15.5" />
      <path d="M15 9.5 L19 9" />
      <path d="M15 12.5 L19 12" />
      <path d="M15 15.5 L19 15" />
    </>
  ),
  // Cara con expresion neutra — representa evaluacion de expresion facial
  consistency: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" strokeWidth={0} />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
      <circle cx="16" cy="18" r="1.5" fill="currentColor" strokeWidth={0} />
    </>
  ),
  facial: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill="currentColor" strokeWidth={0} />
      <circle cx="15" cy="10" r="1" fill="currentColor" strokeWidth={0} />
      <path d="M9 16 Q12 14 15 16" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v7" />
      <path d="M7 9l5 3 5-3" />
      <path d="M9 21l3-8 3 8" />
    </>
  ),
  fluency: (
    <>
      <path d="M4 14c2.5-5 5.5-5 8 0s5.5 5 8 0" />
      <path d="M4 9c2.5-5 5.5-5 8 0s5.5 5 8 0" />
      <path d="M8 20h8" />
    </>
  ),
  // Microfono — representa sesion de habla en vivo
  live: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </>
  ),
}

export const NavIcon = ({ name, active, size = 'md', className }: NavIconProps) => (
  <svg
    className={`${SIZE[size]} shrink-0 transition-colors duration-200 ${
      className ?? (active ? 'text-accent' : 'text-text-muted')
    }`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {PATHS[name]}
  </svg>
)
