import { LoginForm } from '../molecules/LoginForm';

export const AuthCard = () => {
  return (
    <section className="w-full max-w-md bg-[#1c1c1e] border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-yellow-500 text-3xl font-black tracking-tight">OK</span>
          <span className="text-white text-3xl font-light tracking-widest">ACTION</span>
        </div>
        <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
      </div>
      <LoginForm />
    </section>
  );
};