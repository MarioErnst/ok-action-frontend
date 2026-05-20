// Full module documentation: documentacion/modulos/fonacion.md
import { useState } from 'react';
import { ModuleGuideLauncher } from '../../../journey';
import { EvaluationMenu } from '../components/organisms/EvaluationMenu';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { SessionResult, VoiceExercise } from '../../domain/PhonationSession';

type EvaluationView = 'menu' | 'evaluating' | 'results';


export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('menu');
  const [diagnosisResult, setDiagnosisResult] = useState<SessionResult | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<VoiceExercise[]>([]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="phonation-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Fonación</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Entrena la calidad y estabilidad de tu voz.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="phonation" />
    </div>
  </div>
</header>
      
      {view === 'menu' && (
        <>
          
          <div data-journey-id="phonation-selection" className="flex-1 flex flex-col justify-start mt-4">
            <EvaluationMenu
              onStart={(exercises) => {
                setSelectedExercises(exercises);
                setView('evaluating');
              }}
            />
          </div>
        </>
      )}

      {view === 'evaluating' && (
        <EvaluationScreen
          exercises={selectedExercises}
          onFinish={(result) => {
            setDiagnosisResult(result);
            setView('results');
          }}
        />
      )}

      {view === 'results' && (
        <>
          <div className="mx-auto flex w-full max-w-lg justify-end pt-4" data-journey-id="phonation-results">
            
          </div>
          <ResultsScreen
            result={diagnosisResult}
            onReset={() => {
              setDiagnosisResult(null);
              setSelectedExercises([]);
              setView('menu');
            }}
          />
        </>
      )}
    </div>
  );
}

