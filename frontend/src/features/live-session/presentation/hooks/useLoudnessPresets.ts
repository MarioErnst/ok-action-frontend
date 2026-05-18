import { useCallback, useEffect, useState } from 'react'

import type { LoudnessPresetDto } from '../../../loudness/infrastructure/dto/LoudnessDtos'
import { HttpLoudnessRepository } from '../../../loudness/infrastructure/repositories/HttpLoudnessRepository'


interface UseLoudnessPresetsResult {
  presets: LoudnessPresetDto[]
  selectedId: string | null
  select: (presetId: string) => void
}


// Fetches the catalogue of loudness presets on mount and tracks the
// preset chosen by the user for the next live session. Keeping the
// state outside the live orchestrator lets the selector live wherever
// it makes sense in the UI without dragging the live session lifecycle
// into the loudness feature. Selection persists across resets — the
// user usually wants the same preset for subsequent attempts.
export function useLoudnessPresets(): UseLoudnessPresetsResult {
  const [presets, setPresets] = useState<LoudnessPresetDto[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    HttpLoudnessRepository.listPresets()
      .then((items) => {
        if (cancelled) return
        setPresets(items)
        if (items.length === 0) return
        // Prefer the global default; fall back to the first preset so
        // the dropdown always shows a valid initial value when the user
        // ticks loudness.
        const fallback = items.find((preset) => preset.is_default) ?? items[0]
        setSelectedId((current) => current ?? fallback.id)
      })
      .catch((exc) => {
        console.warn('Failed to load loudness presets:', exc)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const select = useCallback((presetId: string) => {
    setSelectedId(presetId)
  }, [])

  return { presets, selectedId, select }
}
