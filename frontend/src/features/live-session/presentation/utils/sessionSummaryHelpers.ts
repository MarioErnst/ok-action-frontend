import type { AccError, AnalysisResult, ConsistencyDetected, LiveDim, MulDetected, PronError } from '../../domain/LiveSession'

export interface AggregatedPronError {
  ph: string
  count: number
  words: string[]
  fix: string
}

export interface AggregatedAccError {
  w: string
  exp: string
  act: string
  count: number
}

export interface AggregatedMul {
  w: string
  totalCount: number
  contexts: string[]
}

export interface AggregatedConsistencyEvent {
  area: string
  severity: string
  count: number
  notes: string[]
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

export function scoreBorderGlow(score: number): { border: string; glow: React.CSSProperties } {
  if (score >= 70) return { border: 'border-success', glow: { boxShadow: '0 0 30px rgba(34,197,94,0.25)' } }
  if (score >= 40) return { border: 'border-warning', glow: { boxShadow: '0 0 30px rgba(250,204,21,0.25)' } }
  return { border: 'border-danger', glow: { boxShadow: '0 0 30px rgba(239,68,68,0.25)' } }
}

export function aggregateErrors(
  analyses: AnalysisResult[],
  dims: LiveDim[],
): { pron: AggregatedPronError[]; acc: AggregatedAccError[]; mul: AggregatedMul[]; consistency: AggregatedConsistencyEvent[] } {
  const pronMap = new Map<string, AggregatedPronError>()
  const accMap = new Map<string, AggregatedAccError>()
  const mulMap = new Map<string, AggregatedMul>()
  const consistencyMap = new Map<string, AggregatedConsistencyEvent>()

  for (const analysis of analyses) {
    if (dims.includes('pron')) {
      for (const e of (analysis.dims.pron?.err ?? []) as PronError[]) {
        const existing = pronMap.get(e.ph) ?? { ph: e.ph, count: 0, words: [], fix: e.fix }
        existing.count++
        if (!existing.words.includes(e.w)) existing.words.push(e.w)
        existing.fix = e.fix
        pronMap.set(e.ph, existing)
      }
    }
    if (dims.includes('acc')) {
      for (const e of (analysis.dims.acc?.err ?? []) as AccError[]) {
        const key = `${e.w}__${e.exp}`
        const existing = accMap.get(key) ?? { w: e.w, exp: e.exp, act: e.act, count: 0 }
        existing.count++
        accMap.set(key, existing)
      }
    }
    if (dims.includes('mul')) {
      for (const d of (analysis.dims.mul?.det ?? []) as MulDetected[]) {
        const existing = mulMap.get(d.w) ?? { w: d.w, totalCount: 0, contexts: [] }
        existing.totalCount += d.n
        if (d.ctx && !existing.contexts.includes(d.ctx)) existing.contexts.push(d.ctx)
        mulMap.set(d.w, existing)
      }
    }
    if (dims.includes('consistency')) {
      for (const d of (analysis.dims.consistency?.det ?? []) as ConsistencyDetected[]) {
        const key = `${d.area}__${d.severity}`
        const existing = consistencyMap.get(key) ?? { area: d.area, severity: d.severity, count: 0, notes: [] }
        existing.count++
        if (d.note && !existing.notes.includes(d.note)) existing.notes.push(d.note)
        consistencyMap.set(key, existing)
      }
    }
  }

  return {
    pron: [...pronMap.values()].sort((a, b) => b.count - a.count),
    acc: [...accMap.values()].sort((a, b) => b.count - a.count),
    mul: [...mulMap.values()].sort((a, b) => b.totalCount - a.totalCount),
    consistency: [...consistencyMap.values()].sort((a, b) => b.count - a.count),
  }
}

export function dimAvgScore(analyses: AnalysisResult[], dim: LiveDim): number | null {
  const scores = analyses.map(a => a.dims[dim]?.sc).filter((s): s is number => s !== undefined)
  if (!scores.length) return null
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
}
