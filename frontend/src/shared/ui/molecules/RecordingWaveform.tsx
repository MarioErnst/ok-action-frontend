import { useAnalyserNode } from '../../hooks/useAnalyserNode';
import { WaveformBars } from '../atoms/WaveformBars';

interface RecordingWaveformProps {
  /**
   * Audio source. Provide ONE of:
   *  - `analyser` if the calling module already manages its own AudioContext
   *    (phonation/loudness/pauses do this through their own hooks).
   *  - `stream` if the module only has a MediaStream (typically because it
   *    captures audio via `useAudioRecorder`); an AnalyserNode will be
   *    derived internally for the duration of the stream.
   */
  analyser?: AnalyserNode | null;
  stream?: MediaStream | null;
  /** When false, the bars settle into the idle state to save CPU. */
  active: boolean;
  /** Visual sizing forwarded to the underlying atom. */
  bars?: number;
  height?: number;
  className?: string;
}

// Component that wraps the AnalyserNode lifecycle (or accepts a pre-built
// one) and renders the WaveformBars atom. Keeps the calling site free of
// any Web Audio plumbing.
export const RecordingWaveform = ({
  analyser,
  stream,
  active,
  bars,
  height,
  className,
}: RecordingWaveformProps) => {
  const derivedAnalyser = useAnalyserNode(stream ?? null);
  const finalAnalyser = analyser ?? derivedAnalyser;

  return (
    <WaveformBars
      analyser={finalAnalyser}
      active={active && finalAnalyser !== null}
      bars={bars}
      height={height}
      className={className}
    />
  );
};
