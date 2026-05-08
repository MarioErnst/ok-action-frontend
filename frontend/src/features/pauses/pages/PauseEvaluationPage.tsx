import usePauseDetection from '../hooks/usePauseDetection';
import { getDefaultPauseQuestion } from '../services/questions';
import PauseRecordingScreen from '../components/organisms/PauseRecordingScreen';
import PauseResultsScreen from '../components/organisms/PauseResultsScreen';
import type { PauseSessionResult } from '../types';

const PAUSE_SESSION_DURATION_MS = 20_000;

export default function PauseEvaluationPage() {
  const prompt = getDefaultPauseQuestion();
  const detection = usePauseDetection(PAUSE_SESSION_DURATION_MS);

  const sessionResult: PauseSessionResult | null = detection.result
    ? {
        promptText: prompt.text,
        ...detection.result,
      }
    : null;

  if (sessionResult) {
    return <PauseResultsScreen result={sessionResult} onReset={detection.reset} />;
  }

  return (
    <PauseRecordingScreen
      promptText={prompt.text}
      phase={detection.phase}
      elapsedMs={detection.elapsedMs}
      durationMs={detection.durationMs}
      db={detection.db}
      noiseFloor={detection.noiseFloor}
      isSilent={detection.isSilent}
      currentMetrics={detection.currentMetrics}
      onStart={() => {
        void detection.start(PAUSE_SESSION_DURATION_MS);
      }}
      onStop={() => {
        void detection.stop();
      }}
      onReset={detection.reset}
    />
  );
}
