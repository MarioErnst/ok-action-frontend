import type { ReactNode } from 'react';

interface SmallTextProps {
  children: ReactNode;
  className?: string;
}

export default function SmallText({ children, className = '' }: SmallTextProps) {
  return (
    <p className={`text-[13px] leading-snug text-text-muted ${className}`}>
      {children}
    </p>
  );
}
