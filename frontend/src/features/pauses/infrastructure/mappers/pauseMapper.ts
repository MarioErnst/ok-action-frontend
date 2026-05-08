import type { PauseSessionResult } from '../../types';
import type { SavePauseSessionDto } from '../dto/PauseDtos';

export function toSavePauseSessionDto(result: PauseSessionResult): SavePauseSessionDto {
  return {
    prompt_text: result.promptText,
    duration_ms: result.durationMs,
    pause_metrics: {
      total_pauses: result.pauseMetrics.totalPauses,
      total_pause_duration_ms: result.pauseMetrics.totalPauseDurationMs,
      average_pause_ms: result.pauseMetrics.averagePauseMs,
      longest_pause_ms: result.pauseMetrics.longestPauseMs,
      silence_ratio: result.pauseMetrics.silenceRatio,
      classification: result.pauseMetrics.classification,
      pauses: result.pauseMetrics.pauses.map((pause) => ({
        start_ms: pause.startMs,
        end_ms: pause.endMs,
        duration_ms: pause.durationMs,
      })),
    },
  };
}
