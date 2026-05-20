import { useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../../../shared/ui/atoms/Button';
import { useAuthStore } from '../../../auth/presentation/store/authStore';
import { INITIAL_SCORES } from '../../domain/InitialScores';
import { WelcomeHeading } from '../components/molecules/WelcomeHeading';
import { InitialRadar } from '../components/organisms/InitialRadar';
import { useWelcomeStore } from '../store/welcomeStore';

const getFirstName = (fullName: string | undefined): string => {
  if (!fullName) return 'bienvenido';
  const trimmed = fullName.trim();
  if (trimmed.length === 0) return 'bienvenido';
  return trimmed.split(/\s+/)[0];
};

export const WelcomePage = () => {
  // Read the flag once on mount. If the user lands here unarmed (e.g. via
  // direct URL), redirect immediately. Reading once prevents the post-click
  // disarm from re-rendering us into the redirect during navigation.
  const armedOnMountRef = useRef(useWelcomeStore.getState().armed);
  const disarm = useWelcomeStore((s) => s.disarm);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!armedOnMountRef.current) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleContinue = () => {
    disarm();
    navigate('/dashboard', { replace: true });
  };

  return (
    <main className="relative min-h-[100dvh] bg-bg overflow-hidden flex flex-col items-center justify-center p-4">
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-accent/15 blur-[100px] animate-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-[110px] animate-pulse-glow"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-10 rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-md p-8 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)] animate-fade-in">
        <WelcomeHeading firstName={getFirstName(user?.fullName)} />

        <div className="flex w-full items-center justify-center py-4">
          <InitialRadar dimensions={INITIAL_SCORES} />
        </div>

        <div
          className="w-full animate-fade-in"
          style={{ animationDelay: '1500ms', animationFillMode: 'backwards' }}
        >
          <Button
            type="button"
            onClick={handleContinue}
            className="w-full max-w-xs mx-auto block h-14 text-lg font-bold rounded-2xl"
          >
            Continuar
          </Button>
        </div>
      </div>
    </main>
  );
};
