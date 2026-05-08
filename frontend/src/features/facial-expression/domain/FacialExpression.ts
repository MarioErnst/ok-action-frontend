// Canonical emotion ids — must match backend ALLOWED_EMOTIONS in
// app/presentation/schemas/facial_expression.py.
export type EmotionId =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprise'
  | 'fear'
  | 'disgust'
  | 'neutral'

// Curated subset of MediaPipe ARKit blendshapes that map to user-facing
// gestures. The full 52-blendshape list is too noisy to display.
export type GestureId =
  | 'mouthSmile'
  | 'mouthFrown'
  | 'mouthOpen'
  | 'mouthPucker'
  | 'mouthPress'
  | 'browDown'
  | 'browInnerUp'
  | 'browOuterUp'
  | 'eyeWide'
  | 'eyeSquint'
  | 'eyeBlinkLeft'
  | 'eyeBlinkRight'
  | 'cheekPuff'
  | 'cheekSquint'
  | 'noseSneer'
  | 'jawForward'
  | 'jawLeft'
  | 'jawRight'
  | 'tongueOut'

// Score per emotion in 0..1, computed from blendshapes.
export type EmotionScores = Record<EmotionId, number>

// Score per gesture in 0..1, with the gesture id as key.
export type GestureScores = Partial<Record<GestureId, number>>

export interface LiveDetection {
  emotions: EmotionScores
  gestures: GestureScores
  dominantEmotion: EmotionId
}

export interface EmotionEvent {
  t_ms: number
  emotion: EmotionId
  // Captures the gestures active at the instant the dominant emotion changed.
  gestures: GestureScores
}

export interface SessionResult {
  id: string
  duration_ms: number
  dominant_emotion: EmotionId | null
  dominant_percentage: number | null
  // Map of emotion -> percentage of total session duration. Sums to 100.
  emotion_distribution: Partial<Record<EmotionId, number>>
  created_at: string
  events: EmotionEvent[]
}

export interface SessionListItem {
  id: string
  duration_ms: number
  dominant_emotion: EmotionId | null
  dominant_percentage: number | null
  created_at: string
}

export type TrackingStatus = 'idle' | 'calibrating' | 'live' | 'saving' | 'results' | 'error'

// Per-blendshape baseline values captured while the user holds a neutral face.
// Subtracting these from live frames cancels out anatomical baselines (low brows,
// resting lip pressure, etc.) so each user's deltas read against their own zero.
export type BlendshapeBaseline = Record<string, number>
