type WelcomeHeadingProps = {
  firstName: string;
};

export const WelcomeHeading = ({ firstName }: WelcomeHeadingProps) => {
  return (
    <header
      className="flex flex-col items-center text-center animate-fade-in"
      style={{ animationDelay: '0ms' }}
    >
      <div className="mb-6 flex items-center gap-2">
        <span className="text-accent text-2xl md:text-3xl font-black tracking-tight">OK</span>
        <span className="text-text text-2xl md:text-3xl font-light tracking-widest">ACTION</span>
      </div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">
        Estado actual
      </p>
      <h1 className="text-text text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
        Hola, {firstName}
      </h1>
      <p className="text-text-muted mt-3 text-sm md:text-base max-w-md">
        Este es tu estado actual sobre 100. Cada eje es un módulo de entrenamiento.
      </p>
    </header>
  );
};
