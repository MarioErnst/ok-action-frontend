// Raw emotion names emitted by the in-browser classifier (the one the
// standalone facial_expression module already uses). The strike
// system's emotion monitor lives entirely on this naming. The mapping
// to backend names (surprise -> surprised, fear -> fearful,
// disgust -> disgusted) happens only when building the facial_summary
// payload submitted with the composed finalize call.

export type RawEmotionName =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprise'
  | 'fear'
  | 'disgust'
  | 'neutral'

// Emotions that, when sustained for the trigger window, force the live
// session to stop. The agreed rule is that positive/neutral expressions
// (happy, surprise, neutral) never trigger; only the four negative ones.
export const TRIGGER_EMOTIONS: ReadonlyArray<RawEmotionName> = [
  'sad',
  'angry',
  'fear',
  'disgust',
]

export interface EmotionTrigger {
  emotion: RawEmotionName
  // Milliseconds from the recording start to the moment the trigger
  // condition was satisfied.
  triggeredAtMs: number
}
