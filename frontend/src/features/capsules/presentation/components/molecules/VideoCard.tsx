export interface VideoCardProps {
  id: string;
  title: string;
  url: string;
  filename?: string;
  onClick: () => void;
}

export const VideoCard = ({ title, onClick }: VideoCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start text-left gap-3 md:gap-4 p-4 md:p-6 bg-surface/80 backdrop-blur-md border border-border rounded-3xl active:scale-95 hover:border-accent/60 md:hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in w-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-surface to-surface-alt border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner animate-float mx-0">
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
        <svg className="w-5 h-5 md:w-7 md:h-7 text-accent relative z-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      <div className="flex flex-col gap-0.5 md:gap-1 w-full mt-1 md:mt-2 relative z-10">
        <h3 className="text-text font-extrabold text-base md:text-xl group-hover:text-accent transition-colors">{title}</h3>
        <span className="text-[10px] md:text-xs font-medium text-text-muted">Reproducir video</span>
      </div>
    </button>
  );
};
