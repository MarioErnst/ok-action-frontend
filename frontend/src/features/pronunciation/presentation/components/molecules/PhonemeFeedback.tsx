import type { PhonemeError } from '../../../domain/PronunciationSession'

interface PhonemeFeedbackProps {
  feedback: string
  phonemeErrors: PhonemeError[]
}

export default function PhonemeFeedback({ feedback, phonemeErrors }: PhonemeFeedbackProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text">{feedback}</p>
      {phonemeErrors.length > 0 && (
        <ul className="flex flex-col gap-2">
          {phonemeErrors.map((error, index) => (
            <li key={index} className="rounded-lg border border-border bg-surface-alt p-3 text-sm">
              <span className="font-semibold text-accent">
                [{error.phoneme}] en &quot;{error.word}&quot;:
              </span>{' '}
              <span className="text-text-muted">{error.actualIssue}</span>
              {error.suggestion && (
                <p className="mt-1 text-xs text-text-muted italic">{error.suggestion}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
