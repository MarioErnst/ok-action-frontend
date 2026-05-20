import usePauseDetection from '../hooks/usePauseDetection';
import usePauseRandomPrompt from '../hooks/usePauseRandomPrompt';
import PauseRecordingScreen from '../components/organisms/PauseRecordingScreen';
import { ModuleGuideLauncher } from '../../journey';
import PauseResultsScreen from '../components/organisms/PauseResultsScreen';
import type { PauseSessionResult } from '../types';

const PAUSE_SESSION_DURATION_MS = 20_000;

export default function PauseEvaluationPage() {
  const promptState = usePauseRandomPrompt();
  const detection = usePauseDetection(PAUSE_SESSION_DURATION_MS);

  if (promptState.status === 'loading') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-start bg-bg text-text">
        <p className="text-sm text-text-muted">Cargando consigna...</p>
      </main>
    );
  }

  if (promptState.status === 'error') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-start bg-bg p-4 text-text">
        <p className="text-sm text-text-muted">{promptState.message}</p>
      </main>
    );
  }

  const prompt = promptState.prompt;
  const sessionResult: PauseSessionResult | null = detection.result
    ? {
        promptId: prompt.id,
        promptText: prompt.text,
        ...detection.result,
      }
    : null;

  if (sessionResult) {
    return <PauseResultsScreen result={sessionResult} onReset={detection.reset} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10 gap-6">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="pauses-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Pausas</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Aprende a usar el silencio con intención.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="pauses" />
          </div>
        </div>
      </header>
      <PauseRecordingScreen
        promptText={prompt.text}
        phase={detection.phase}
        elapsedMs={detection.elapsedMs}
        durationMs={detection.durationMs}
        db={detection.db}
        noiseFloor={detection.noiseFloor}
        isSilent={detection.isSilent}
        currentMetrics={detection.currentMetrics}
        analyser={detection.analyser}
        onStart={() => {
          void detection.start(PAUSE_SESSION_DURATION_MS);
        }}
        onStop={() => {
          void detection.stop();
        }}
        onReset={detection.reset}
      />
    </div>
  );
}
