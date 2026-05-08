import type {
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
export const GESTURE_ACTIVE_THRESHOLD = 0.25

// Per-emotion minimum score required to win the dominant slot.
//
// Why per-emotion: each blendshape combo has a different baseline noise floor
// in a relaxed face. Anger sits high because most people have slightly lowered
// brows at rest; smile sits near zero. A single global threshold cannot
// satisfy both without either over-detecting anger or under-detecting smiles.
//
// These values are calibrated against vision-sync's reference behavior and
// adjusted so that a relaxed face reads as neutral, while a deliberately
// expressed emotion crosses its threshold.
const EMOTION_THRESHOLD: Record<Exclude<EmotionId, 'neutral'>, number> = {
  happy: 0.30,
  sad: 0.30,
  angry: 0.45,    // brows-only baseline often hits 0.30, so push past it
  surprise: 0.25,
  fear: 0.20,     // formula is already scaled by 0.8
  disgust: 0.40,  // amplified by *2, real disgust still scores 0.5+
}

// Emotion score formulas — derived from FACS Action Units (Ekman) and tuned
// against vision-sync's reference implementation.
//
//   - happy (AU6+AU12):     direct mouthSmile (cheekSquint is unreliable)
//   - sad (AU15+AU17):      mouthFrown + mouthRollLower, amplified
//   - angry (AU4+AU23):     average of browDown and mouthPress
//   - surprise (AU1+2+26):  jawOpen + browInnerUp average
//   - fear (AU1+2+20):      jawOpen + browInnerUp + mouthStretch, scaled
//   - disgust (AU9+AU10):   noseSneer + mouthUpperUp, amplified
//
// Both vision-sync and this file use simple sums/averages rather than
// Math.min, because in practice MediaPipe doesn't co-activate all FACS
// components even on clear expressions. Per-emotion thresholds compensate
// for the false positives that come with summing.
function scoreEmotions(b: BlendshapeMap): EmotionScores {
  const happy = clamp01(avg2(b, 'mouthSmileLeft', 'mouthSmileRight'))

  const sad = clamp01(
    (avg2(b, 'mouthFrownLeft', 'mouthFrownRight') + get(b, 'mouthRollLower')) * 2.5
  )

  const angry = clamp01(
    (avg2(b, 'browDownLeft', 'browDownRight') +
      avg2(b, 'mouthPressLeft', 'mouthPressRight')) /
      2
  )

  const surprise = clamp01((get(b, 'jawOpen') + get(b, 'browInnerUp')) / 2)

  const fear = clamp01(
    ((get(b, 'jawOpen') +
      get(b, 'browInnerUp') +
      avg2(b, 'mouthStretchLeft', 'mouthStretchRight')) /
      3) *
      0.8
  )

  const disgust = clamp01(
    (avg2(b, 'noseSneerLeft', 'noseSneerRight') +
      avg2(b, 'mouthUpperUpLeft', 'mouthUpperUpRight')) *
      2
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
 * only when no candidate clears its own threshold — this keeps anger from
 * winning on relaxed-but-low brows while still letting clear smiles win at
 * a much lower score.
 */
function pickDominant(emotions: EmotionScores): EmotionId {
  let bestId: EmotionId = 'neutral'
  // We rank by "headroom over threshold" instead of raw score so an emotion
  // that just barely clears a high bar (anger ≥ 0.45) doesn't beat one that
  // crushes a lower bar (surprise = 0.7 over a 0.25 threshold).
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
 * Convert a flat array of MediaPipe blendshape categories into our domain types.
 * Categories arrive as { categoryName: string; score: number }[].
 */
export function classify(
  categories: Array<{ categoryName: string; score: number }>
): LiveDetection {
  const map: BlendshapeMap = {}
  for (const cat of categories) map[cat.categoryName] = cat.score

  const emotions = scoreEmotions(map)
  const gestures = scoreGestures(map)
  const dominantEmotion = pickDominant(emotions)
  return { emotions, gestures, dominantEmotion }
}
