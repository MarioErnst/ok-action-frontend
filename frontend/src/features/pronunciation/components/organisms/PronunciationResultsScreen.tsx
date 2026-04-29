import { useEffect, useRef, useState } from 'react'
import { toSavePronunciationSessionDto } from '../../infrastructure/mappers/pronunciationMapper'
import { HttpPronunciationRepository } from '../../infrastructure/repositories/HttpPronunciationRepository'
import type { PronunciationSessionResult } from '../../types'
import PhonemeFeedback from '../molecules/PhonemeFeedback'
import PronunciationMetrics from '../molecules/PronunciationMetrics'

const LEVEL_LABELS: Record<string, string> = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

function getScoreBorderClass(score: number): string {
  if (score >= 70) return 'border-success'
  if (score >= 40) return 'border-warning'
  return 'border-danger'
}

interface PronunciationResultsScreenProps {
  result: PronunciationSessionResult
  onReset: () => void
}

export default function PronunciationResultsScreen({
  result,
  onReset,
}: PronunciationResultsScreenProps) {
  const savedRef = useRef(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    HttpPronunciationRepository.saveSession(toSavePronunciationSessionDto(result)).catch(() => {})
  }, [result])

  const overallScore = Math.round(result.metrics.overallScore)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 p-6 pb-28 animate-fade-in relative z-10">
      <div className="flex flex-col items-center gap-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/10 blur-[50px] rounded-full pointer-events-none animate-pulse-glow" />
        
        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 ${getScoreBorderClass(overallScore)} shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-surface/50 backdrop-blur-md transition-all duration-500 hover:scale-105`}
          style={overallScore >= 70 ? { boxShadow: '0 0 30px rgba(34,197,94,0.3)' } : overallScore >= 40 ? { boxShadow: '0 0 30px rgba(250,204,21,0.3)' } : { boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
        >
          <span className={`text-5xl font-extrabold ${getScoreColorClass(overallScore)} drop-shadow-md`}>
            {overallScore}
          </span>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-text-muted mt-2">Puntuación general</p>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent shadow-[0_0_10px_rgba(245,158,11,0.2)]">
          Nivel: {LEVEL_LABELS[result.level] ?? result.level}
        </span>
      </div>

      <div className="bg-surface/40 backdrop-blur-sm rounded-3xl p-5 border border-border/50">
        <PronunciationMetrics metrics={result.metrics} />
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Retroalimentación</p>
        <p className="text-sm font-medium text-text leading-relaxed">{result.summaryFeedback}</p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted pl-2">Detalle por frase</p>
        {result.phraseEvaluations.map((evaluation, index) => (
          <div key={index} style={{ animationDelay: `${index * 100}ms` }} className="rounded-2xl border border-border/50 bg-surface/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-accent/40 animate-fade-in">
            <button
              type="button"
              className="flex w-full items-center justify-between p-5 text-left active:scale-[0.98] transition-transform"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <div className="min-w-0 flex-1 pr-4">
                <p className="text-xs font-bold text-accent mb-1 uppercase tracking-wider">Frase {index + 1}</p>
                <p className="truncate text-sm font-medium text-text">{evaluation.phraseText}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`font-extrabold text-lg ${getScoreColorClass(evaluation.metrics.overallScore)}`}>
                  {Math.round(evaluation.metrics.overallScore)}
                </span>
                <span className="text-accent flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 border border-accent/20">
                  {expandedIndex === index ? '▲' : '▼'}
                </span>
              </div>
            </button>
            {expandedIndex === index && (
              <div className="flex flex-col gap-4 border-t border-border/40 p-5 bg-surface-alt/30">
                <PronunciationMetrics metrics={evaluation.metrics} />
                <PhonemeFeedback
                  feedback={evaluation.feedback}
                  phonemeErrors={evaluation.phonemeErrors}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
      >
        <span className="relative z-10">REPETIR EVALUACIÓN</span>
      </button>
    </div>
  )
}
