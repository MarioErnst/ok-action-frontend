import type { MuletillasEvaluation } from '../../../domain/MuletillasSession'
import { ModuleGuideLauncher } from '../../../../journey'
import { HighlightedTranscript } from '../atoms/HighlightedTranscript'
import MuletillasDetail from '../molecules/MuletillasDetail'

type Props = {
  result: MuletillasEvaluation
  questionText: string
  onReset: () => void
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-danger'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl sm:text-3xl font-bold ${color}`}>
        {Math.round(score)}
      </span>
      <span className="text-[#9CA3AF] text-xs text-center leading-tight">{label}</span>
    </div>
  )
}

export default function MuletillasResults({ result, questionText, onReset }: Props) {
  const hasMuletillas = result.muletillasDetected.length > 0

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-lg mx-auto px-4 sm:px-0 animate-[fade-in_0.4s_ease-out]" data-journey-id="muletillas-results">
      <div className="flex justify-end">
        <ModuleGuideLauncher guideId="muletillas" />
      </div>
      <h2 className="text-[#F8FAFC] text-xl sm:text-2xl font-bold text-center">
        Resultado de tu evaluacion
      </h2>

      {/* Answered question shown for reference */}
      <div className="bg-[#232B38] rounded-xl p-3 sm:p-4 border border-[#334155]">
        <p className="text-[#9CA3AF] text-xs uppercase tracking-widest mb-1">Pregunta respondida</p>
        <p className="text-[#F8FAFC] text-sm sm:text-base">{questionText}</p>
      </div>

      {/* Scores */}
      <div className="bg-[#1C1C1E] rounded-xl p-4 sm:p-6 border border-[#334155]">
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <ScoreCircle score={result.overallScore} label="General" />
          <ScoreCircle score={result.fluencyScore} label="Fluidez" />
          <ScoreCircle score={result.muletillasScore} label="Sin muletillas" />
        </div>

        {/* Detected muletillas counter */}
        <div className="mt-4 pt-4 border-t border-[#334155] flex justify-between items-center">
          <span className="text-[#9CA3AF] text-sm">Muletillas detectadas</span>
          <span className="text-[#F8FAFC] font-bold text-lg">
            {result.totalMuletillasCount}
            {result.muletillasPerMinute > 0 && (
              <span className="text-[#9CA3AF] text-xs font-normal ml-2">
                ({result.muletillasPerMinute.toFixed(1)}/min)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Transcript with filler-word highlights */}
      {result.transcript && (
        <div className="bg-[#1C1C1E] rounded-xl p-4 sm:p-5 border border-[#334155]">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-widest mb-2">
            Tu respuesta
          </p>
          <HighlightedTranscript
            transcript={result.transcript}
            positions={result.muletillasPositions}
            className="text-[#F8FAFC] text-sm sm:text-base leading-relaxed"
          />
        </div>
      )}

      {/* General feedback */}
      <div className="bg-[#232B38] rounded-xl p-4 sm:p-5 border border-[#334155] space-y-3">
        <p className="text-[#F8FAFC] text-sm sm:text-base leading-relaxed">{result.feedback}</p>
        {result.strengths && (
          <div>
            <p className="text-success text-xs font-semibold uppercase tracking-wide mb-1">
              Fortalezas
            </p>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">{result.strengths}</p>
          </div>
        )}
        {result.improvementAreas && (
          <div>
            <p className="text-warning text-xs font-semibold uppercase tracking-wide mb-1">
              Areas de mejora
            </p>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">{result.improvementAreas}</p>
          </div>
        )}
      </div>

      {/* Detailed muletillas list */}
      {hasMuletillas && (
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-[#F8FAFC] text-sm font-semibold uppercase tracking-wide">
            Muletillas encontradas
          </h3>
          {result.muletillasDetected.map((muletilla) => (
            <MuletillasDetail key={muletilla.word} muletilla={muletilla} />
          ))}
        </div>
      )}

      {/* Only shown when there was real speech but no muletillas — not on silence */}
      {!hasMuletillas && result.overallScore > 0 && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
          <p className="text-success font-semibold text-sm sm:text-base">
            Excelente. No se detectaron muletillas en tu respuesta.
          </p>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-gray-900 transition-colors duration-200"
      >
        Nueva evaluacion
      </button>
    </div>
  )
}
