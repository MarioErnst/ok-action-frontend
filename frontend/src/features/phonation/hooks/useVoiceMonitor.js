// src/features/phonation/hooks/useVoiceMonitor.js

import { useCallback, useRef, useState } from 'react';

export default function useVoiceMonitor() {
  const [hz, setHz] = useState(null);
  const [db, setDb] = useState(-100);
  const [isListening, setIsListening] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [noiseFloor, setNoiseFloor] = useState(-100);
  const [frames, setFrames] = useState([]);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const workletNodeRef = useRef(null);

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
        const nextDb = event.data?.db ?? -100;

        setHz(nextHz);
        setDb(nextDb);
        setFrames((prev) => [...prev, { hz: nextHz, db: nextDb, timestamp: Date.now() }]);
      };

      source.connect(workletNode);
      setIsListening(true);
    } catch (error) {
      console.error('useVoiceMonitor.start failed:', error);
    }
  }, [isListening]);

  const stop = useCallback(async () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
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
