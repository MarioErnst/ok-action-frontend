// Full module documentation: documentacion/modulos/fonacion.md
import { useState } from 'react';
import { ModuleGuideLauncher } from '../../../journey';
import { EvaluationMenu } from '../components/organisms/EvaluationMenu';
import { EvaluationScreen } from '../components/organisms/EvaluationScreen';
import { ResultsScreen } from '../components/organisms/ResultsScreen';
import type { SessionResult, VoiceExercise } from '../../domain/PhonationSession';

type EvaluationView = 'menu' | 'evaluating' | 'results';

const GuideHeader = ({ anchorId }: { anchorId: string }) => (
  <div className="mx-auto flex w-full max-w-lg justify-end px-6 pt-4" data-journey-id={anchorId}>
    <ModuleGuideLauncher guideId="phonation" />
  </div>
);

export default function EvaluationPage() {
  const [view, setView] = useState<EvaluationView>('menu');
  const [diagnosisResult, setDiagnosisResult] = useState<SessionResult | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<VoiceExercise[]>([]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      {view === 'menu' && (
        <>
          <GuideHeader anchorId="phonation-intro" />
          <div data-journey-id="phonation-selection">
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
          <GuideHeader anchorId="phonation-results" />
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

