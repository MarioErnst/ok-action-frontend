import { useState, useCallback } from 'react';
import { VOICE_EXERCISES } from '../../services/exercises';
import type { VoiceExercise } from '../../domain/PhonationSession';

export interface UseExerciseSelectionReturn {
  selectedIds: Set<string>;
  selectedCount: number;
  totalSeconds: number;
  toggle: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedExercises: () => VoiceExercise[];
}

/**
 * Encapsulates the exercise selection logic for the evaluation menu.
 *
 * Initializes with all exercises selected so the user can deselect
 * individual items rather than building a list from scratch.
 *
 * totalSeconds is derived — not stored — to avoid state duplication.
 */
export function useExerciseSelection(): UseExerciseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(VOICE_EXERCISES.map((e) => e.id)),
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(VOICE_EXERCISES.map((e) => e.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedExercises = useCallback((): VoiceExercise[] => {
    return VOICE_EXERCISES.filter((e) => selectedIds.has(e.id));
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  const totalSeconds = Math.round(
    VOICE_EXERCISES.filter((e) => selectedIds.has(e.id)).reduce(
      (sum, e) => sum + e.durationMs,
      0,
    ) / 1000,
  );

  return {
    selectedIds,
    selectedCount,
    totalSeconds,
    toggle,
    selectAll,
    deselectAll,
    getSelectedExercises,
  };
}
