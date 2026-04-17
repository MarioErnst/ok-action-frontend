import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = '', ...props }: InputProps) => {
  return (
    <input
      className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors duration-200 ${className}`}
      {...props}
    />
  );
};