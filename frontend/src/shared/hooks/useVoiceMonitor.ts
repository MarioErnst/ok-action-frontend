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

export default function useVoiceMonitor() {
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

    if (streamRef.current) {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
      }, CALIBRATION_DURATION_MS);

      isListeningRef.current = true;
      setIsListening(true);
    } catch (error) {
      console.error('useVoiceMonitor.start failed:', error);
      await stop();
    }
  }, [stop]);

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
