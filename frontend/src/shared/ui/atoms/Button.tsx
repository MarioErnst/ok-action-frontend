import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>;

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold border-transparent transition-colors duration-300',
  secondary: 'bg-transparent hover:bg-gray-800 text-amber-400 border border-amber-400 transition-colors duration-300',
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  return (
    <button
      type="button"
      className={`w-full py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 text-sm ${variantClasses[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};