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
  const base = 'px-3.5 py-2.5 rounded-[10px] border font-bold transition-opacity';
  const variants = {
    primary: 'border-accent bg-accent text-bg cursor-pointer',
    secondary: 'border-border bg-surface text-text-muted cursor-pointer',
  };
  const disabledClass = disabled ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabledClass}`}
    >
      {label}
    </button>
  );
}
