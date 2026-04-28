export type NavIconName = 'dashboard' | 'phonation' | 'pronunciation' | 'accentuation' | 'loudness'

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
