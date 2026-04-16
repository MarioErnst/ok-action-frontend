import { colors } from '../../theme';

interface PhonationButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function PhonationButton({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}: PhonationButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${isPrimary ? colors.accent : colors.border}`,
        background: isPrimary ? colors.accent : colors.surface,
        color: isPrimary ? colors.bg : colors.textMuted,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
