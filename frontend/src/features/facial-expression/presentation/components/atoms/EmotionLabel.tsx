import type { EmotionId } from '../../../domain/FacialExpression'
import { EMOTION_LABELS, EMOTION_TEXT_CLASS } from '../emotionStyles'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl font-extrabold tracking-tight',
}

type Props = {
  emotion: EmotionId
  size?: Size
  uppercase?: boolean
}

export function EmotionLabel({ emotion, size = 'md', uppercase = false }: Props) {
  return (
    <span
      className={`${SIZE_CLASS[size]} ${EMOTION_TEXT_CLASS[emotion]} ${uppercase ? 'uppercase tracking-widest' : ''}`}
    >
      {EMOTION_LABELS[emotion]}
    </span>
  )
}
