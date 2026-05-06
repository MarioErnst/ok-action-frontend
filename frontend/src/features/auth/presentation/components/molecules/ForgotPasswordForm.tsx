import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../../../shared/ui/atoms/Button';
import { Input } from '../../../../../shared/ui/atoms/Input';
import { useForgotPasswordMutation } from '../../hooks/useForgotPasswordMutation';

type ForgotPasswordFormProps = {
  onGoToLogin: () => void;
};

export const ForgotPasswordForm = ({ onGoToLogin }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const mutation = useForgotPasswordMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email) {
      mutation.mutate(email);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@empresa.com"
        type="email"
        required
      />

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </Button>

      {mutation.isError && (
        <div className="flex flex-col items-center gap-2 mt-1 animate-fade-in">
          <p className="text-danger text-sm text-center">
            {mutation.error instanceof Error ? mutation.error.message : 'No fue posible enviar el correo'}
          </p>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="flex flex-col items-center gap-2 mt-1 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-success flex items-center justify-center animate-scale-in">
            <span className="text-success text-xl">✓</span>
          </div>
          <p className="text-success text-sm text-center">
            Se ha enviado un enlace a tu correo
          </p>
        </div>
      )}

      <p className="text-center text-text-muted text-sm mt-1">
        ¿Recordaste tu contraseña?{' '}
        <button
          type="button"
          onClick={onGoToLogin}
          className="text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer"
        >
          Iniciar sesión
        </button>
      </p>
    </form>
  );
};
