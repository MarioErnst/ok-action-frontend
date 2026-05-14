import type { ButtonHTMLAttributes } from 'react';

type GuideHelpButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const GuideHelpButton = ({ className = '', ...props }: GuideHelpButtonProps) => (
  <button
    type="button"
    className={`min-h-[40px] rounded-full border border-accent/40 px-4 text-sm font-bold text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${className}`}
    {...props}
  >
    Ayuda
  </button>
);

