// src/features/phonation/hooks/useVoiceMonitor.js

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DB = -100;
const MAX_FRAMES = 100;
const CALIBRATION_DURATION_MS = 3000;

export default function useVoiceMonitor() {
  const [hz, setHz] = useState(null);
  const [db, setDb] = useState(DEFAULT_DB);
  const [isListening, setIsListening] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [noiseFloor, setNoiseFloor] = useState(DEFAULT_DB);
  const [frames, setFrames] = useState([]);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const workletNodeRef = useRef(null);
  const calibrationSamplesRef = useRef([]);
  const calibrationTimeoutRef = useRef(null);
  const isCalibratingRef = useRef(false);

  const stop = useCallback(async () => {
    if (calibrationTimeoutRef.current) {
      clearTimeout(calibrationTimeoutRef.current);
      calibrationTimeoutRef.current = null;
    }
    calibrationSamplesRef.current = [];
    isCalibratingRef.current = false;

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

    audioContextRef.current = null;
    streamRef.current = null;
    sourceRef.current = null;
    workletNodeRef.current = null;

    setIsListening(false);
    setIsCalibrating(false);
  }, []);

  const start = useCallback(async () => {
    if (isListening) return;

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

      workletNode.port.onmessage = (event) => {
        const nextHz = event.data?.hz ?? null;
        const nextDb = event.data?.db ?? DEFAULT_DB;

        if (isCalibratingRef.current) {
          calibrationSamplesRef.current.push(nextDb);
          return;
        }

        setHz(nextHz);
        setDb(nextDb);
        setFrames((prev) => {
          const next = [...prev, { hz: nextHz, db: nextDb, timestamp: Date.now() }];
          return next.length > MAX_FRAMES ? next.slice(-MAX_FRAMES) : next;
        });
      };

      source.connect(workletNode);
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

      setIsListening(true);
    } catch (error) {
      console.error('useVoiceMonitor.start failed:', error);
      await stop();
    }
  }, [isListening, stop]);

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
    start,
    stop,
  };
}
