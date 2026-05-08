import type {
  BlendshapeBaseline,
  EmotionId,
  EmotionScores,
  GestureId,
  GestureScores,
  LiveDetection,
} from '../domain/FacialExpression'

// MediaPipe FaceLandmarker emits 52 ARKit-style blendshapes keyed by name.
type BlendshapeMap = Record<string, number>

const get = (b: BlendshapeMap, key: string): number => b[key] ?? 0

// Average a left/right pair, returning 0 when both are missing.
const avg2 = (b: BlendshapeMap, leftKey: string, rightKey: string): number =>
  (get(b, leftKey) + get(b, rightKey)) / 2

// Clamp value to [0, 1] so heuristic combinations never push above 1.
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

// Threshold above which a gesture is considered "active" enough to display.
// After baseline subtraction this measures *change from rest*, so a low value
// (0.18) is enough to flag a real movement while filtering noise.
export const GESTURE_ACTIVE_THRESHOLD = 0.18

// Per-emotion minimum score required to win the dominant slot.
//
// These thresholds operate on *baseline-adjusted* values (deltas above the
// user's neutral face). They're calibrated to be low enough that real
// expressions register, while still requiring deliberate movement.
const EMOTION_THRESHOLD: Record<Exclude<EmotionId, 'neutral'>, number> = {
  happy: 0.20,
  sad: 0.20,
  angry: 0.18,    // OR-of components — single-channel anger needs a real change
  surprise: 0.20,
  fear: 0.15,
  disgust: 0.25,
}

/**
 * Convert MediaPipe's category list into a flat name -> score map.
 * Pulled out so the calibration step can accumulate the same shape that
 * classify() consumes, without repeating the array scan in two places.
 */
export function categoriesToMap(
  categories: Array<{ categoryName: string; score: number }>,
): BlendshapeMap {
  const map: BlendshapeMap = {}
  for (const cat of categories) map[cat.categoryName] = cat.score
  return map
}

/**
 * Subtract the user's neutral-face baseline from each blendshape, clamped to 0.
 * The result represents how much each muscle has activated *above its resting
 * value* for this user — independent of anatomical baselines.
 */
export function applyBaseline(
  map: BlendshapeMap,
  baseline: BlendshapeBaseline,
): BlendshapeMap {
  const out: BlendshapeMap = {}
  for (const [key, value] of Object.entries(map)) {
    const base = baseline[key] ?? 0
    out[key] = Math.max(0, value - base)
  }
  return out
}

// Emotion score formulas — derived from FACS Action Units (Ekman) and tuned
// against vision-sync's reference implementation, then adjusted to operate on
// baseline-subtracted deltas.
//
// Anger uses Math.max instead of an average because real-world expressions of
// anger split between two patterns: brow-lowering ("frowning") without lip
// pressure, and lip-pressing without much brow movement. Using max lets either
// pattern fire anger; baseline subtraction prevents resting low-brows from
// triggering it falsely.
function scoreEmotions(b: BlendshapeMap): EmotionScores {
  const happy = clamp01(avg2(b, 'mouthSmileLeft', 'mouthSmileRight'))

  const sad = clamp01(
    (avg2(b, 'mouthFrownLeft', 'mouthFrownRight') + get(b, 'mouthRollLower')) * 2.5,
  )

  const angry = clamp01(
    Math.max(
      avg2(b, 'browDownLeft', 'browDownRight'),
      avg2(b, 'mouthPressLeft', 'mouthPressRight'),
    ),
  )

  const surprise = clamp01((get(b, 'jawOpen') + get(b, 'browInnerUp')) / 2)

  const fear = clamp01(
    ((get(b, 'jawOpen') +
      get(b, 'browInnerUp') +
      avg2(b, 'mouthStretchLeft', 'mouthStretchRight')) /
      3) *
      0.8,
  )

  const disgust = clamp01(
    (avg2(b, 'noseSneerLeft', 'noseSneerRight') +
      avg2(b, 'mouthUpperUpLeft', 'mouthUpperUpRight')) *
      2,
  )

  // Neutral is computed as 1 minus the strongest non-neutral score, so the
  // HUD bar shrinks as any real expression takes over.
  const maxOther = Math.max(happy, sad, angry, surprise, fear, disgust)
  const neutral = clamp01(1 - maxOther)

  return { happy, sad, angry, surprise, fear, disgust, neutral }
}

// Mapping from our gesture id to the blendshape keys that activate it.
const GESTURE_FORMULAS: Record<GestureId, (b: BlendshapeMap) => number> = {
  mouthSmile: (b) => avg2(b, 'mouthSmileLeft', 'mouthSmileRight'),
  mouthFrown: (b) => avg2(b, 'mouthFrownLeft', 'mouthFrownRight'),
  mouthOpen: (b) => get(b, 'jawOpen'),
  mouthPucker: (b) => get(b, 'mouthPucker'),
  mouthPress: (b) => avg2(b, 'mouthPressLeft', 'mouthPressRight'),
  browDown: (b) => avg2(b, 'browDownLeft', 'browDownRight'),
  browInnerUp: (b) => get(b, 'browInnerUp'),
  browOuterUp: (b) => avg2(b, 'browOuterUpLeft', 'browOuterUpRight'),
  eyeWide: (b) => avg2(b, 'eyeWideLeft', 'eyeWideRight'),
  eyeSquint: (b) => avg2(b, 'eyeSquintLeft', 'eyeSquintRight'),
  eyeBlinkLeft: (b) => get(b, 'eyeBlinkLeft'),
  eyeBlinkRight: (b) => get(b, 'eyeBlinkRight'),
  cheekPuff: (b) => get(b, 'cheekPuff'),
  cheekSquint: (b) => avg2(b, 'cheekSquintLeft', 'cheekSquintRight'),
  noseSneer: (b) => avg2(b, 'noseSneerLeft', 'noseSneerRight'),
  jawForward: (b) => get(b, 'jawForward'),
  jawLeft: (b) => get(b, 'jawLeft'),
  jawRight: (b) => get(b, 'jawRight'),
  tongueOut: (b) => get(b, 'tongueOut'),
}

function scoreGestures(b: BlendshapeMap): GestureScores {
  const out: GestureScores = {}
  for (const [id, formula] of Object.entries(GESTURE_FORMULAS) as [
    GestureId,
    (b: BlendshapeMap) => number,
  ][]) {
    const v = clamp01(formula(b))
    if (v > 0) out[id] = v
  }
  return out
}

/**
 * Pick the dominant emotion using per-emotion thresholds. Returns 'neutral'
 * only when no candidate clears its own threshold.
 *
 * Ranking is by *headroom over threshold*, not raw score, so an emotion that
 * crushes a low bar (surprise = 0.7 over 0.20) beats one that just barely
 * clears a high bar (anger = 0.20 over 0.18).
 */
function pickDominant(emotions: EmotionScores): EmotionId {
  let bestId: EmotionId = 'neutral'
  let bestHeadroom = 0
  for (const [id, score] of Object.entries(emotions) as [EmotionId, number][]) {
    if (id === 'neutral') continue
    const threshold = EMOTION_THRESHOLD[id as Exclude<EmotionId, 'neutral'>]
    const headroom = score - threshold
    if (headroom > 0 && headroom > bestHeadroom) {
      bestHeadroom = headroom
      bestId = id as EmotionId
    }
  }
  return bestId
}

/**
 * Convert a MediaPipe blendshape category list (optionally baseline-adjusted
 * via `applyBaseline` ahead of time) into our domain `LiveDetection`.
 *
 * The function accepts an already-mapped object so callers can apply baseline
 * subtraction once and reuse the result for both classify() and any HUD
 * rendering, avoiding double-processing.
 */
export function classifyMap(map: BlendshapeMap): LiveDetection {
  const emotions = scoreEmotions(map)
  const gestures = scoreGestures(map)
  const dominantEmotion = pickDominant(emotions)
  return { emotions, gestures, dominantEmotion }
}

/**
 * Convenience entry point that converts categories and classifies in one go.
 * If a baseline is supplied, it is subtracted from each blendshape first.
 */
export function classify(
  categories: Array<{ categoryName: string; score: number }>,
  baseline?: BlendshapeBaseline,
): LiveDetection {
  const raw = categoriesToMap(categories)
  const adjusted = baseline ? applyBaseline(raw, baseline) : raw
  return classifyMap(adjusted)
}
