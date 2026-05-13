import { useEffect, useState } from 'react';

/**
 * Wraps a MediaStream into a Web Audio AnalyserNode that consumers (e.g.
 * the WaveformBars atom) can read frame data from.
 *
 * Use this only when the calling module owns just a MediaStream (typically
 * the case for features built on top of `useAudioRecorder`). Modules that
 * already manage their own AudioContext (phonation/loudness/pauses) should
 * tap an AnalyserNode off their existing context instead of going through
 * this hook to avoid spinning up a second AudioContext for the same input.
 *
 * The AnalyserNode is intentionally not connected to `audioContext.destination`
 * so the user does not hear their own voice echoed back.
 */
export function useAnalyserNode(stream: MediaStream | null): AnalyserNode | null {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) {
      setAnalyser(null);
      return undefined;
    }

    // AudioContext creation requires a user gesture on iOS Safari; callers
    // must invoke this hook from a state that follows a user action (typically
    // right after `getUserMedia` resolved, which itself needs a gesture).
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const node = audioContext.createAnalyser();
    source.connect(node);
    setAnalyser(node);

    return () => {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
      try {
        source.disconnect();
      } catch {
        // Already disconnected.
      }
      audioContext.close().catch(() => {
        // Closing while already closed is safe to ignore.
      });
      setAnalyser(null);
    };
  }, [stream]);

  return analyser;
}
