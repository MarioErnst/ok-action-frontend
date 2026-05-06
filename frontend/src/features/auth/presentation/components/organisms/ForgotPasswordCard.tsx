import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '../molecules/ForgotPasswordForm';

export const ForgotPasswordCard = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full max-w-md bg-surface border border-border/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-accent text-3xl font-black tracking-tight">OK</span>
          <span className="text-text text-3xl font-light tracking-widest">ACTION</span>
        </div>
        <p className="text-text-muted text-sm">
          Ingresa tu correo para recuperar la contraseña
        </p>
      </div>

      <ForgotPasswordForm onGoToLogin={() => navigate('/auth')} />
    </section>
  );
};
