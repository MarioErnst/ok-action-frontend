import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../../../shared/ui/atoms/Button';
import { Input } from '../../../../../shared/ui/atoms/Input';
import { useRegisterMutation } from '../../hooks/useRegisterMutation';

type RegisterFormProps = {
  onGoToLogin: () => void;
};

export const RegisterForm = ({ onGoToLogin }: RegisterFormProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useRegisterMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ fullName, email, password });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
      <Input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Nombre completo"
        type="text"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@empresa.com"
        type="email"
      />

      <div className="relative">
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          type={showPassword ? 'text' : 'password'}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors cursor-pointer p-1"
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          )}
        </button>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Registrando...' : 'Registrar usuario'}
      </Button>

      {mutation.isError && (
        <div className="flex flex-col items-center gap-2 mt-1 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-danger flex items-center justify-center animate-scale-in">
            <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-danger text-sm">No fue posible registrar el usuario</p>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="flex flex-col items-center gap-2 mt-1 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-success flex items-center justify-center animate-scale-in">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-success text-sm">Usuario registrado correctamente</p>
        </div>
      )}

      <p className="text-center text-text-muted text-sm mt-1">
        ¿Ya tienes cuenta?{' '}
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