import { useCallback, useEffect, useRef, useState } from 'react'


interface UseElapsedTimerOptions {
  // Maximum seconds before `onLimit` fires. Once the counter reaches
  // this value the timer keeps ticking; the caller is expected to call
  // `stop()` or `reset()` in the limit handler.
  limitSeconds: number
  // Fires once per tick that crosses `limitSeconds`. Kept as a callback
  // (not derived state) so the caller can trigger imperative side
  // effects (close stream, finalize recording, etc.) without an extra
  // useEffect on the orchestrator.
  onLimit: () => void
}


interface UseElapsedTimerResult {
  // Current count in seconds since `start()` was last called.
  seconds: number
  // Begin counting from zero. Safe to call repeatedly: a running timer
  // is cleared before the new one starts.
  start: () => void
  // Stop the timer without resetting `seconds`.
  stop: () => void
  // Stop and zero the counter.
  reset: () => void
}


// Generic 1s-resolution elapsed counter with a one-shot limit handler.
// Used by the live session to track wall-clock duration of a recording
// and trigger the time_limit auto-stop. The latest `onLimit` is read
// through a ref so the caller can keep its handler closure fresh
// without re-creating the timer.
export function useElapsedTimer({
  limitSeconds,
  onLimit,
}: UseElapsedTimerOptions): UseElapsedTimerResult {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onLimitRef = useRef(onLimit)

  useEffect(() => {
    onLimitRef.current = onLimit
  }, [onLimit])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setSeconds(0)
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1
        if (next >= limitSeconds) {
          onLimitRef.current()
        }
        return next
      })
    }, 1000)
  }, [limitSeconds])

  const reset = useCallback(() => {
    stop()
    setSeconds(0)
  }, [stop])

  useEffect(() => stop, [stop])

  return { seconds, start, stop, reset }
}
