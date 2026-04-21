import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../../../shared/ui/atoms/Button';
import { Input } from '../../../../../shared/ui/atoms/Input';
import { useLoginMutation } from '../../hooks/useLoginMutation';

type LoginFormProps = {
  onGoToRegister: () => void;
};

export const LoginForm = ({ onGoToRegister }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useLoginMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 w-full">
      {/* --- CORREO --- */}
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">
          Correo
        </label>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.com"
          type="email"
        />
      </div>

      {/* --- CONTRASEÑA --- */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Contraseña
          </label>
          <button 
            type="button" 
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        
        <div className="relative">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type={showPassword ? "text" : "password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors cursor-pointer p-1"
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
      </div>

      {/* --- BOTÓN PRINCIPAL --- */}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>

      {/* --- DIVISOR --- */}
      <div className="flex items-center gap-3 mt-2">
        <div className="h-px bg-gray-700 flex-1"></div>
        <span className="text-gray-500 text-xs font-medium">O continuar con</span>
        <div className="h-px bg-gray-700 flex-1"></div>
      </div>

      {/* --- BOTONES SOCIALES --- */}
      <div className="grid grid-cols-4 gap-3">
        {/* Google */}
        <button type="button" className="flex items-center justify-center p-2.5 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-800 transition-all duration-300 group cursor-pointer">
          <svg className="w-5 h-5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </button>
        
        {/* Apple */}
        <button type="button" className="flex items-center justify-center p-2.5 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-800 transition-all duration-300 group cursor-pointer">
          <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.88 3.5-.84 1.58.11 2.76.75 3.51 1.84-3.05 1.83-2.53 5.54.54 6.74-1.12 2.15-2.54 4.54-4.54 4.58-.04 0-.08 0-.09-.13zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        </button>
        
        {/* Facebook */}
        <button type="button" className="flex items-center justify-center p-2.5 border border-gray-700 rounded-lg hover:border-[#1877F2]/50 hover:bg-[#1877F2]/10 transition-all duration-300 group cursor-pointer">
          <svg className="w-5 h-5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </button>
        
        {/* Outlook */}
        <button type="button" className="flex items-center justify-center p-2.5 border border-gray-700 rounded-lg hover:border-[#0078D4]/50 hover:bg-[#0078D4]/10 transition-all duration-300 group cursor-pointer">
          <svg className="w-5 h-5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1.383 6.963L11.417 4.19v15.348l-10.034-2.8z"/>
            <path d="M11.417 4.19h11.2V19.54h-11.2z" fill="#00A4EF"/>
          </svg>
        </button>
      </div>

      {/* --- ESTADOS DE MUTATION --- */}
      {mutation.isError && (
        <div className="flex flex-col items-center gap-2 mt-2 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 flex items-center justify-center animate-scale-in">
            <span className="text-red-500 text-xl font-bold">✕</span>
          </div>
          <p className="text-red-400 text-sm">Correo o contraseña incorrectos</p>
        </div>
      )}

      {mutation.isSuccess && (
        <div className="flex flex-col items-center gap-2 mt-2 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-green-500 flex items-center justify-center animate-scale-in">
            <span className="text-green-500 text-xl">✓</span>
          </div>
          <p className="text-green-400 text-sm">¡Ingreso exitoso!</p>
        </div>
      )}
      {/* --- REGISTRO --- */}
      <p className="text-center text-gray-500 text-sm mt-2">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          onClick={onGoToRegister}
          className="text-amber-500 hover:text-amber-400 font-medium transition-colors cursor-pointer"
        >
          Registrar usuario
        </button>
      </p>
    </form>
    
  );
};
