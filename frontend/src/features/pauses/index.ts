export { default as PauseEvaluationPage } from './pages/PauseEvaluationPage';
export { default as usePauseDetection } from './hooks/usePauseDetection';
export { analyzePauseFrames, classifyPauseMetrics } from './services/pauseAnalysis';
export type {
  PauseClassification,
  PauseDetectionPhase,
  PauseDetectionResult,
  PauseInterval,
  PauseMetrics,
  PausePrompt,
  PauseSessionResult,
} from './types';
