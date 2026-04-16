// src/features/phonation/components/atoms/SmallText.jsx

/**
 * Atom: texto pequeno para labels, ayudas y estado.
 */
export default function SmallText({ children, color = '#9CA3AF', margin = '0' }) {
  return <p style={{ color, margin, fontSize: 13, lineHeight: 1.4 }}>{children}</p>;
}
