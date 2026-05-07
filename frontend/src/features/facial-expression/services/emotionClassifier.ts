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

// Threshold the strongest non-neutral emotion must exceed to win the dominant
// slot. 0.35 leaves enough margin that a relaxed face with naturally low brows
// or stubble (which can elevate mouthPress/browDown baselines) reads as neutral.
const NEUTRAL_DOMINANCE_THRESHOLD = 0.35

// Margin the dominant emotion must have over the runner-up to "win" cleanly.
// Below this the face reads as neutral, which prevents the badge from flickering
// between two close-scoring emotions on borderline expressions.
const DOMINANT_MIN_MARGIN = 0.08

// Threshold above which a gesture is considered "active" enough to display.
export const GESTURE_ACTIVE_THRESHOLD = 0.25

// Emotion score formulas — derived from FACS Action Units (Ekman).
//
// For emotions whose FACS recipe explicitly requires multiple co-active AUs
// (anger = AU4 + AU7 + AU23; disgust = AU9 + AU10) we use Math.min on the
// component blendshapes instead of summing them. Summing yields false
// positives when only one component is naturally elevated (e.g. resting low
// brows trigger "anger" by themselves). Min requires both components to fire.
// The multiplier (~1.4–1.6) renormalizes the combined score back into 0..1.
//
// Sources: FACS literature, vision-sync reference implementation.
//   - happy (AU6+AU12):       mouthSmile + cheekSquint  (sum is fine: a polite
//                                                        smile without cheek
//                                                        squint should still register)
//   - sad (AU1+AU15+AU17):    mouthFrown + browInnerUp  (rare false positives at rest)
//   - angry (AU4+AU7+AU23):   min(browDown, mouthPress) (co-activation required)
//   - surprise (AU1+2+5+26):  jawOpen + browInnerUp + eyeWide
//   - fear (AU1+2+20):        jawOpen + browInnerUp + mouthStretch (scaled down)
//   - disgust (AU9+AU10):     min(noseSneer, mouthUpperUp) (co-activation required)
function scoreEmotions(b: BlendshapeMap): EmotionScores {
  const happy = clamp01(
    avg2(b, 'mouthSmileLeft', 'mouthSmileRight') +
      avg2(b, 'cheekSquintLeft', 'cheekSquintRight') * 0.5
  )

  const sad = clamp01(
    avg2(b, 'mouthFrownLeft', 'mouthFrownRight') + get(b, 'browInnerUp') * 0.4
  )

  const browDown = avg2(b, 'browDownLeft', 'browDownRight')
  const mouthPress = avg2(b, 'mouthPressLeft', 'mouthPressRight')
  const angry = clamp01(Math.min(browDown, mouthPress) * 1.6)

  const surprise = clamp01(
    (get(b, 'jawOpen') + get(b, 'browInnerUp')) / 2 +
      avg2(b, 'eyeWideLeft', 'eyeWideRight') * 0.5
  )

  const fear = clamp01(
    ((get(b, 'jawOpen') +
      get(b, 'browInnerUp') +
      avg2(b, 'mouthStretchLeft', 'mouthStretchRight')) /
      3) *
      0.6
  )

  const noseSneer = avg2(b, 'noseSneerLeft', 'noseSneerRight')
  const mouthUpperUp = avg2(b, 'mouthUpperUpLeft', 'mouthUpperUpRight')
  const disgust = clamp01(Math.min(noseSneer, mouthUpperUp) * 1.6)

  // Neutral is computed as 1 minus the strongest non-neutral score.
  const maxOther = Math.max(happy, sad, angry, surprise, fear, disgust)
  const neutral = clamp01(1 - maxOther)

  return { happy, sad, angry, surprise, fear, disgust, neutral }
}

// Mapping from our gesture id to the blendshape keys that activate it.
// Some gestures combine left/right, some are direct.
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

function pickDominant(emotions: EmotionScores): EmotionId {
  // Sort non-neutral emotions by score descending so we can compare the top
  // two and apply a margin requirement.
  const ranked = (Object.entries(emotions) as [EmotionId, number][])
    .filter(([id]) => id !== 'neutral')
    .sort((a, b) => b[1] - a[1])

  const [topId, topScore] = ranked[0]
  const secondScore = ranked[1]?.[1] ?? 0

  // Two guards both fall back to neutral:
  //   1) the top score is too weak to be confident in (relaxed face)
  //   2) the top and runner-up are too close to call (ambiguous expression)
  if (topScore < NEUTRAL_DOMINANCE_THRESHOLD) return 'neutral'
  if (topScore - secondScore < DOMINANT_MIN_MARGIN) return 'neutral'
  return topId
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
