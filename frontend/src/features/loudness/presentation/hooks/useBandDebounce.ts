// Manages loudness band classification with hysteresis and debounce.
// Used exclusively by useLoudnessCoach; not part of the public API.
import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyLoudness } from '../../services/loudnessClassifier';
import type { LoudnessBand, LoudnessConfig } from '../../domain/LoudnessSession';

const HYSTERESIS_MARGIN_DB = 2;
const BAND_DEBOUNCE_MS = 400;

/**
 * Returns true only when db is clearly inside band — far enough from any boundary
 * that a small fluctuation will not flip the classification immediately.
 * The margin prevents rapid toggling at band edges.
 */
function isDeepEnoughInBand(
  band: LoudnessBand,
  db: number,
  noiseFloor: number,
  config: LoudnessConfig,
): boolean {
  switch (band) {
    case 'silence':
      return db < noiseFloor + config.silenceOffsetDb - HYSTERESIS_MARGIN_DB;
    case 'too-low':
      return (
        db >= noiseFloor + config.silenceOffsetDb + HYSTERESIS_MARGIN_DB &&
        db < config.tooLowCeilingDbfs - HYSTERESIS_MARGIN_DB
      );
    case 'optimal':
      return (
        db >= config.tooLowCeilingDbfs + HYSTERESIS_MARGIN_DB &&
        db < config.optimalCeilingDbfs - HYSTERESIS_MARGIN_DB
      );
    case 'too-high':
      return (
        db >= config.optimalCeilingDbfs + HYSTERESIS_MARGIN_DB &&
        db < config.clipThresholdDbfs - HYSTERESIS_MARGIN_DB
      );
    case 'clipping':
      return db >= config.clipThresholdDbfs + HYSTERESIS_MARGIN_DB;
  }
}

interface UseBandDebounceResult {
  band: LoudnessBand;
  clearBandDebounce: () => void;
  resetBandState: () => void;
}

/**
 * Classifies the current dB reading into a loudness band and applies debounce
 * with hysteresis so that brief excursions near a boundary do not cause flickering.
 *
 * A band transition is only committed when the new band stays stable for
 * BAND_DEBOUNCE_MS and the current dB value is clearly inside the new band.
 *
 * @param db - Current dB reading from the voice monitor.
 * @param noiseFloor - Measured ambient noise floor in dBFS.
 * @param effectiveConfig - Resolved loudness thresholds; null disables classification.
 */
export function useBandDebounce(
  db: number,
  noiseFloor: number,
  effectiveConfig: LoudnessConfig | null,
): UseBandDebounceResult {
  const [band, setBand] = useState<LoudnessBand>('silence');

  const acceptedBandRef = useRef<LoudnessBand>('silence');
  const pendingBandRef = useRef<LoudnessBand>('silence');
  const bandDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBandDebounce = useCallback(() => {
    if (bandDebounceTimeoutRef.current !== null) {
      clearTimeout(bandDebounceTimeoutRef.current);
      bandDebounceTimeoutRef.current = null;
    }
  }, []);

  const resetBandState = useCallback(() => {
    clearBandDebounce();
    acceptedBandRef.current = 'silence';
    pendingBandRef.current = 'silence';
    setBand('silence');
  }, [clearBandDebounce]);

  useEffect(() => {
    if (effectiveConfig === null) return;

    const rawBand = classifyLoudness(db, noiseFloor, effectiveConfig);
    const acceptedBand = acceptedBandRef.current;

    // Stay on the accepted band unless the new reading is deep enough to confirm a real change.
    const nextCandidateBand =
      rawBand === acceptedBand || isDeepEnoughInBand(rawBand, db, noiseFloor, effectiveConfig)
        ? rawBand
        : acceptedBand;

    pendingBandRef.current = nextCandidateBand;

    if (nextCandidateBand === acceptedBand) {
      clearBandDebounce();
      return;
    }

    clearBandDebounce();
    bandDebounceTimeoutRef.current = setTimeout(() => {
      // Guard against a stale closure firing after the pending band changed again.
      if (pendingBandRef.current !== nextCandidateBand) return;
      acceptedBandRef.current = nextCandidateBand;
      setBand(nextCandidateBand);
      bandDebounceTimeoutRef.current = null;
    }, BAND_DEBOUNCE_MS);
  }, [clearBandDebounce, db, effectiveConfig, noiseFloor]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearBandDebounce();
    };
  }, [clearBandDebounce]);

  return { band, clearBandDebounce, resetBandState };
}
