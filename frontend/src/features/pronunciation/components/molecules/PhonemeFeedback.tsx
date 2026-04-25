import type { PhonemeError } from '../../types'

interface PhonemeFeedbackProps {
  feedback: string
  phonemeErrors: PhonemeError[]
}

export default function PhonemeFeedback({ feedback, phonemeErrors }: PhonemeFeedbackProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-700">{feedback}</p>
      {phonemeErrors.length > 0 && (
        <ul className="flex flex-col gap-2">
          {phonemeErrors.map((error, index) => (
            <li key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <span className="font-semibold text-yellow-800">
                [{error.phoneme}] en &quot;{error.word}&quot;:
              </span>{' '}
              <span className="text-gray-700">{error.actualIssue}</span>
              {error.suggestion && (
                <p className="mt-1 text-blue-700 italic">{error.suggestion}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
