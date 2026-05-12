import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../../../../api/client';
import { NavIcon } from '../../../../../shared/ui/atoms/NavIcon';
import type { NavIconName } from '../../../../../shared/ui/atoms/NavIcon';

export type SubExercise = {
  id: string;
  title: string;
  tags: string[];
  viewed: boolean;
};

export type ExerciseCategory = {
  id: string;
  title: string;
  exercises: SubExercise[];
};

export type ModuleHistory = {
  moduleId: string;
  moduleName: string;
  iconName: NavIconName;
  averageScore: number;
  categories: ExerciseCategory[];
};

export const ExerciseHistory = () => {
  const [history, setHistory] = useState<ModuleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleHistory | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);

    apiRequest<ModuleHistory[]>('/profile/history')
      .then(res => setHistory(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-32 md:h-40 rounded-3xl bg-surface-alt/30 animate-pulse border border-border/40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 text-sm flex items-center gap-3 animate-fade-in">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        No se pudo cargar el historial de ejercicios. Por favor, intenta nuevamente más tarde.
      </div>
    );
  }

  const historyArray = Array.isArray(history) ? history : ((history as any)?.data || []);

  const hasActivity = historyArray.some((mod: ModuleHistory) =>
    mod.averageScore > 0 ||
    mod.categories.some(cat => cat.exercises.some(ex => ex.viewed))
  );

  if (!hasActivity) {
    return (
      <div className="text-text-muted text-sm p-4 bg-surface-alt/20 rounded-2xl border border-border/30 animate-fade-in">
        Aún no has completado ejercicios. ¡Empieza a entrenar para ver tu progreso aquí!
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {historyArray.map((mod: ModuleHistory) => {
          return (
            <button
              key={mod.moduleId}
              onClick={() => setSelectedModule(mod)}
              className="group relative flex flex-col items-start text-left gap-3 md:gap-4 p-4 md:p-6 bg-surface/80 backdrop-blur-md border border-border rounded-3xl active:scale-95 hover:border-accent/60 md:hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-surface to-surface-alt border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner animate-float mx-0">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full opacity-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
                <NavIcon name={mod.iconName} active={false} size="md" className="text-accent relative z-10 md:scale-125" />
              </div>

              <div className="flex flex-col gap-0.5 md:gap-1 w-full mt-1 md:mt-2 relative z-10">
                <h3 className="text-text font-extrabold text-base md:text-xl group-hover:text-accent transition-colors">{mod.moduleName}</h3>
                <span className="text-[10px] md:text-xs font-medium text-text-muted">Ver ejercicios</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de Desglose */}
      {selectedModule && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 animate-fade-in" style={{ position: 'fixed' }}>
          <div 
            className="absolute inset-0 bg-black/80 md:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedModule(null)}
          />
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface border border-border/60 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-scale-in">
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-border/40 bg-surface-alt/30 shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-text">{selectedModule.moduleName}</h2>
                <p className="text-xs md:text-sm text-accent font-medium mt-1">Desglose de ejercicios realizados</p>
              </div>
              <button 
                onClick={() => setSelectedModule(null)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-border/50 flex items-center justify-center transition-colors text-text-muted hover:text-accent border border-border/50 shrink-0 ml-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-surface/50 pb-safe">
              <div className="flex flex-col gap-5 md:gap-6">
                {selectedModule.categories.map((category) => {
                  const viewedCount = category.exercises.filter(e => e.viewed).length;
                  const totalCount = category.exercises.length;

                  return (
                    <div key={category.id} className="animate-fade-in bg-surface p-5 md:p-6 rounded-3xl border border-border/50 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-lg font-bold text-text tracking-wide">{category.title}</h4>
                        <p className="text-xs font-medium text-text-muted mt-1">{viewedCount} de {totalCount} revisados</p>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {category.exercises.map(ex => (
                          <div 
                            key={ex.id} 
                            className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${ex.viewed ? 'border-accent/60 bg-surface-alt/40 shadow-[0_5px_15px_-5px_rgba(245,158,11,0.15)]' : 'border-border/40 bg-surface-alt/10'}`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${ex.viewed ? 'border-accent bg-accent shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-border/50 bg-surface-alt'}`}>
                              {ex.viewed && (
                                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-bold transition-colors ${ex.viewed ? 'text-accent' : 'text-text/90'}`}>{ex.title}</p>
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {ex.tags.map((tag, idx) => (
                                  <span key={idx} className="inline-flex items-center rounded-lg bg-surface-alt/80 px-2 py-0.5 text-[10px] font-bold text-text-muted border border-white/5">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
