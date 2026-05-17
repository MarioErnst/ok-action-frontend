// Shared mic-capture hook used by phonation, loudness, pauses and the
// live-session orchestrator. Returns the calibrated noise floor, the
// live Hz / dB values and a rolling buffer of recent frames. Sits in
// shared/ because more than one feature consumes it; previously lived
// inside the phonation feature.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioFrame } from '../types/audioTypes';

const DEFAULT_DB = -100;
const MAX_FRAMES = 100;
const CALIBRATION_DURATION_MS = 3000;
const UI_UPDATE_INTERVAL_MS = 67; // ~15 fps

interface WorkletMessage {
  hz: number | null;
  db: number;
}

interface UseVoiceMonitorOptions {
  // Optional MediaStream provided by the caller. When passed the hook
  // reuses it (no second getUserMedia prompt) and does not stop its
  // tracks on cleanup — the caller owns the lifecycle. Used by the
  // live-session orchestrator, which already opens one mic stream and
  // pipes it to both the AssemblyAI streamer and the voice monitor.
  // Standalone modules omit this option and the hook keeps its
  // original behavior of opening / closing its own stream.
  externalStream?: MediaStream | null
  // Optional callback fired right after the noise-floor calibration
  // window closes. Live needs this to know when to advance to the
  // next calibration step; standalone modules can ignore it because
  // they show their own calibration UI inline.
  onNoiseFloorReady?: (noiseFloor: number) => void
}

export default function useVoiceMonitor(options: UseVoiceMonitorOptions = {}) {
  const { externalStream, onNoiseFloorReady } = options
  // The caller-provided stream is read through a ref so a change after
  // start() does not retrigger the effect; lifecycle is driven by
  // explicit start/stop calls, same as the legacy hook.
  const externalStreamRef = useRef<MediaStream | null>(externalStream ?? null)
  externalStreamRef.current = externalStream ?? null
  const [hz, setHz] = useState<number | null>(null);
  const [db, setDb] = useState(DEFAULT_DB);
  const [isListening, setIsListening] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [noiseFloor, setNoiseFloor] = useState(DEFAULT_DB);
  const [frames, setFrames] = useState<AudioFrame[]>([]);
  // Exposed so visualisation components (RecordingWaveform) can read frame
  // data from the same AudioContext used by the worklet; reusing the source
  // avoids spinning up a second AudioContext for the same microphone.
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const calibrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCalibratingRef = useRef(false);
  const isListeningRef = useRef(false);
  const pendingHzRef = useRef<number | null>(null);
  const pendingDbRef = useRef(DEFAULT_DB);
  const pendingFramesRef = useRef<AudioFrame[]>([]);
  const uiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(async () => {
    if (calibrationTimeoutRef.current) {
      clearTimeout(calibrationTimeoutRef.current);
      calibrationTimeoutRef.current = null;
    }
    calibrationSamplesRef.current = [];
    isCalibratingRef.current = false;

    if (uiTimerRef.current) {
      clearInterval(uiTimerRef.current);
      uiTimerRef.current = null;
    }
    pendingHzRef.current = null;
    pendingDbRef.current = DEFAULT_DB;
    pendingFramesRef.current = [];

    if (workletNodeRef.current?.port) {
      workletNodeRef.current.port.onmessage = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (error) {
        console.error('useVoiceMonitor.stop source disconnect failed:', error);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
      } catch (error) {
        console.error('useVoiceMonitor.stop context close failed:', error);
      }
    }

    // Only stop the stream tracks when we own the stream. When the
    // caller injected one (live session) the orchestrator handles its
    // own teardown; stopping the tracks here would also kill the
    // AssemblyAI streamer that shares the same mic.
    if (streamRef.current && externalStreamRef.current === null) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (analyserNodeRef.current) {
      try {
        analyserNodeRef.current.disconnect();
      } catch {
        // Already disconnected.
      }
    }

    audioContextRef.current = null;
    streamRef.current = null;
    sourceRef.current = null;
    workletNodeRef.current = null;
    analyserNodeRef.current = null;
    setAnalyser(null);

    isListeningRef.current = false;
    setIsListening(false);
    setIsCalibrating(false);
  }, []);

  const start = useCallback(async () => {
    if (isListeningRef.current) return;

    try {
      // Prefer the caller-provided stream over a new getUserMedia
      // request so we never prompt the user twice for the mic.
      const externalStream = externalStreamRef.current;
      const stream =
        externalStream ??
        (await navigator.mediaDevices.getUserMedia({ audio: true, video: false }));
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      await audioContext.audioWorklet.addModule('/worklets/phonation.worklet.js');

      const workletNode = new AudioWorkletNode(audioContext, 'phonation-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
        const nextHz = event.data?.hz ?? null;
        const nextDb = event.data?.db ?? DEFAULT_DB;

        if (isCalibratingRef.current) {
          calibrationSamplesRef.current.push(nextDb);
          return;
        }

        // Acumular en refs en vez de disparar setState por cada mensaje
        pendingHzRef.current = nextHz;
        pendingDbRef.current = nextDb;
        pendingFramesRef.current.push({ hz: nextHz, db: nextDb, timestamp: Date.now() });
      };

      // Flush de refs a state a ~15 fps
      uiTimerRef.current = setInterval(() => {
        if (isCalibratingRef.current) return;

        setHz(pendingHzRef.current);
        setDb(pendingDbRef.current);

        if (pendingFramesRef.current.length > 0) {
          const batch = pendingFramesRef.current;
          pendingFramesRef.current = [];
          setFrames((prev) => {
            const next = prev.concat(batch);
            return next.length > MAX_FRAMES ? next.slice(-MAX_FRAMES) : next;
          });
        }
      }, UI_UPDATE_INTERVAL_MS);

      source.connect(workletNode);

      // Side branch off the same source so consumers can visualise the
      // live audio without forcing the worklet pipeline through a node
      // it does not need.
      const analyserNode = audioContext.createAnalyser();
      analyserNodeRef.current = analyserNode;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      setIsCalibrating(true);
      isCalibratingRef.current = true;
      calibrationSamplesRef.current = [];

      calibrationTimeoutRef.current = setTimeout(() => {
        const samples = calibrationSamplesRef.current;
        const averageDb = samples.length
          ? samples.reduce((sum, value) => sum + value, 0) / samples.length
          : DEFAULT_DB;

        setNoiseFloor(averageDb);
        workletNodeRef.current?.port?.postMessage({ noiseFloor: averageDb });

        isCalibratingRef.current = false;
        setIsCalibrating(false);
        calibrationSamplesRef.current = [];
        calibrationTimeoutRef.current = null;
        onNoiseFloorReady?.(averageDb);
      }, CALIBRATION_DURATION_MS);

      isListeningRef.current = true;
      setIsListening(true);
    } catch (error) {
      console.error('useVoiceMonitor.start failed:', error);
      await stop();
    }
  }, [stop, onNoiseFloorReady]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    hz,
    db,
    isListening,
    isCalibrating,
    noiseFloor,
    frames,
    analyser,
    start,
    stop,
  };
}
