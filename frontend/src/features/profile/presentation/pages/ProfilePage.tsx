import { useAuthStore } from '../../../auth/presentation/store/authStore';
import { ExerciseHistory } from '../components/organisms/ExerciseHistory';

export const ProfilePage = () => {
  const user = useAuthStore(s => s.user);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex-1 flex flex-col animate-fade-in relative z-10 w-full gap-10">
      {/* Glow effect behind header */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />
      
      <header className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8 pt-4 pb-2 relative">
        <div className="relative group cursor-pointer">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-gradient-to-br from-surface to-surface-alt flex items-center justify-center relative z-10">
            <svg className="w-12 h-12 md:w-14 md:h-14 text-text-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div className="absolute bottom-1 right-1 bg-accent text-bg w-8 h-8 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(245,158,11,0.4)] transform group-hover:scale-110 transition-transform z-20 border-2 border-bg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left">
          <p className="text-accent text-xs font-bold tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">Mi Perfil</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-text tracking-tight mb-2">{user?.fullName}</h1>
          <p className="text-text-muted text-sm md:text-base bg-surface-alt/50 px-4 py-1.5 rounded-full border border-white/5 inline-block">{user?.email}</p>
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-bold text-text mb-6 pl-2">Ejercicios realizados</h2>
        <ExerciseHistory />
      </section>
    </div>
  );
};
