type NavIndicatorProps = {
  active: boolean
  variant?: 'vertical' | 'horizontal'
}

export const NavIndicator = ({ active, variant = 'vertical' }: NavIndicatorProps) => {
  const base = 'bg-accent rounded-full transition-all duration-200 origin-center absolute'

  if (variant === 'horizontal') {
    return (
      <span
        className={`${base} top-0 left-1/2 -translate-x-1/2 h-[3px] w-6 ${
          active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
        }`}
      />
    )
  }

  return (
    <span
      className={`${base} left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 ${
        active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
      }`}
    />
  )
}
