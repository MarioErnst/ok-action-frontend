import type { EmotionId, GestureId } from '../../domain/FacialExpression'

// Single source of truth for the labels and accent classes used across atoms,
// molecules, and the histogram. Keep this in sync with the backend emotion
// allow-list in app/presentation/schemas/facial_expression.py.
export const EMOTION_LABELS: Record<EmotionId, string> = {
  happy: 'Feliz',
  sad: 'Triste',
  angry: 'Enojado',
  surprise: 'Sorpresa',
  fear: 'Miedo',
  disgust: 'Asco',
  neutral: 'Neutral',
}

// Tailwind text color per emotion. We avoid arbitrary hex values to keep
// theme overrides (light/dark) consistent with the rest of the app.
export const EMOTION_TEXT_CLASS: Record<EmotionId, string> = {
  happy: 'text-amber-300',
  sad: 'text-sky-400',
  angry: 'text-red-400',
  surprise: 'text-violet-300',
  fear: 'text-fuchsia-300',
  disgust: 'text-emerald-400',
  neutral: 'text-text-muted',
}

// Background gradient class for the dominant emotion ring & cards.
export const EMOTION_RING_CLASS: Record<EmotionId, string> = {
  happy: 'from-amber-300 to-amber-500',
  sad: 'from-sky-400 to-sky-600',
  angry: 'from-red-400 to-red-600',
  surprise: 'from-violet-400 to-violet-600',
  fear: 'from-fuchsia-400 to-fuchsia-600',
  disgust: 'from-emerald-400 to-emerald-600',
  neutral: 'from-text-muted to-text-muted',
}

// Background fill class for emotion bars (solid).
export const EMOTION_BAR_CLASS: Record<EmotionId, string> = {
  happy: 'bg-amber-300',
  sad: 'bg-sky-400',
  angry: 'bg-red-400',
  surprise: 'bg-violet-400',
  fear: 'bg-fuchsia-400',
  disgust: 'bg-emerald-400',
  neutral: 'bg-text-muted',
}

export const GESTURE_LABELS: Record<GestureId, string> = {
  mouthSmile: 'Sonrisa',
  mouthFrown: 'Boca caída',
  mouthOpen: 'Boca abierta',
  mouthPucker: 'Labios fruncidos',
  mouthPress: 'Labios apretados',
  browDown: 'Ceño fruncido',
  browInnerUp: 'Cejas internas arriba',
  browOuterUp: 'Cejas externas arriba',
  eyeWide: 'Ojos abiertos',
  eyeSquint: 'Ojos entornados',
  eyeBlinkLeft: 'Guiño izquierdo',
  eyeBlinkRight: 'Guiño derecho',
  cheekPuff: 'Mejillas infladas',
  cheekSquint: 'Mejillas levantadas',
  noseSneer: 'Arruga de nariz',
  jawForward: 'Mandíbula adelante',
  jawLeft: 'Mandíbula izquierda',
  jawRight: 'Mandíbula derecha',
  tongueOut: 'Lengua afuera',
}
