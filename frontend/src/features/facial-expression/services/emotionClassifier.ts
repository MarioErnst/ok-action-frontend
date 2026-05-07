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

// Threshold below which "neutral" wins by default.
const NEUTRAL_DOMINANCE_THRESHOLD = 0.2

// Threshold above which a gesture is considered "active" enough to display.
export const GESTURE_ACTIVE_THRESHOLD = 0.25

// Emotion score formulas — derived from FACS Action Units (Ekman).
// Sources verified against vision-sync reference and FACS literature:
// - happy (AU6+AU12): mouthSmile + cheekSquint
// - sad (AU1+AU15): mouthFrown + browInnerUp
// - angry (AU4+AU7+AU23): browDown + mouthPress
// - surprise (AU1+AU2+AU5+AU26): jawOpen + browInnerUp + eyeWide
// - fear (AU1+AU2+AU20): jawOpen + browInnerUp + mouthStretch
// - disgust (AU9+AU10): noseSneer + mouthUpperUp
function scoreEmotions(b: BlendshapeMap): EmotionScores {
  const happy = clamp01(
    avg2(b, 'mouthSmileLeft', 'mouthSmileRight') +
      avg2(b, 'cheekSquintLeft', 'cheekSquintRight') * 0.5
  )

  const sad = clamp01(
    avg2(b, 'mouthFrownLeft', 'mouthFrownRight') + get(b, 'browInnerUp') * 0.5
  )

  const angry = clamp01(
    avg2(b, 'browDownLeft', 'browDownRight') +
      avg2(b, 'mouthPressLeft', 'mouthPressRight') * 0.6
  )

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

  const disgust = clamp01(
    avg2(b, 'noseSneerLeft', 'noseSneerRight') +
      avg2(b, 'mouthUpperUpLeft', 'mouthUpperUpRight') * 0.5
  )

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
  let bestId: EmotionId = 'neutral'
  let bestScore = 0
  for (const [id, score] of Object.entries(emotions) as [EmotionId, number][]) {
    if (id === 'neutral') continue
    if (score > bestScore) {
      bestScore = score
      bestId = id
    }
  }
  // Below the dominance threshold, prefer neutral so weak signals don't flicker.
  return bestScore < NEUTRAL_DOMINANCE_THRESHOLD ? 'neutral' : bestId
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
