import { useState } from 'react';
import { LoginForm } from '../molecules/LoginForm';
import { RegisterForm } from '../molecules/RegisterForm';

export const AuthCard = () => {
  const [view, setView] = useState<'login' | 'register'>('login');

  return (
    <section className="w-full max-w-md bg-surface border border-border/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-accent text-3xl font-black tracking-tight">OK</span>
          <span className="text-text text-3xl font-light tracking-widest">ACTION</span>
        </div>
        <p className="text-text-muted text-sm">
          {view === 'login' ? 'Inicia sesión para continuar' : 'Registra tu usuario para continuar'}
        </p>
      </div>

      {view === 'login' ? (
        <LoginForm onGoToRegister={() => setView('register')} />
      ) : (
        <RegisterForm onGoToLogin={() => setView('login')} />
      )}
    </section>
  );
};
