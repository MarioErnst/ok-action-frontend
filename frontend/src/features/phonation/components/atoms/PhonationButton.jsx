// src/features/phonation/components/atoms/PhonationButton.jsx

/**
 * Atom: boton base para acciones de monitoreo de voz.
 */
export default function PhonationButton({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${isPrimary ? '#F59E0B' : '#334155'}`,
        background: isPrimary ? '#F59E0B' : '#1C1C1E',
        color: isPrimary ? '#0A0A0A' : '#9CA3AF',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
