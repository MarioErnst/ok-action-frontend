import type { ReactNode } from 'react';

interface SmallTextProps {
  children: ReactNode;
  color?: string;
  margin?: string;
}

export default function SmallText({ children, color = '#9CA3AF', margin = '0' }: SmallTextProps) {
  return <p style={{ color, margin, fontSize: 13, lineHeight: 1.4 }}>{children}</p>;
}
