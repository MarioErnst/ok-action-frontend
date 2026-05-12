import { apiRequest, ApiError } from '../../../api/client'
import type {
  EvaluateRoundResponse,
  SessionDetail,
  SessionListItem,
  SessionMode,
  StartSessionResponse,
} from '../domain/LinguisticVersatility'

// Audio uploads can take longer than text endpoints (network + Gemini
// inference). 60s is enough for a slow connection but caps a hung request
// before the user sees an indefinite spinner.
const AUDIO_REQUEST_TIMEOUT_MS = 60_000

const PREFIX = '/linguistic-versatility'

async function uploadAudio<T>(
  path: string,
  audio: Blob,
  fields: Record<string, string> = {},
): Promise<T> {
  const form = new FormData()
  // Filename must have an extension Gemini understands; use the blob's MIME
  // type to derive it so iOS (mp4) and other browsers (webm) both work.
  const ext = audio.type.includes('mp4') ? 'mp4' : 'webm'
  form.append('audio', audio, `answer.${ext}`)
  for (const [k, v] of Object.entries(fields)) form.append(k, v)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AUDIO_REQUEST_TIMEOUT_MS)
  try {
    return await apiRequest<T, FormData>(path, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al enviar el audio.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

interface StartSessionRawDto {
  session_id: string
  started_at: string
  mode: SessionMode
  rounds_total: number
  prompts: Array<{ id: string; text: string; category: string; difficulty: string }>
}

interface EvaluateRoundRawDto {
  round_index: number
  prompt_id: string | null
  is_audio_intelligible: boolean
  score: number | null
  vocabulary_richness: number | null
  feedback: string
}

interface SessionDetailRawDto {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  score: number | null
  status: 'active' | 'completed' | 'aborted'
  created_at: string
  metrics: {
    mode: SessionMode
    rounds_total: number
    rounds_completed: number
    vocabulary_richness_avg: number | null
  }
  rounds: Array<{
    round_index: number
    prompt_id: string | null
    score: number | null
    vocabulary_richness: number | null
    is_audio_intelligible: boolean
  }>
}

interface SessionListItemRawDto {
  id: string
  started_at: string
  status: 'active' | 'completed' | 'aborted'
  score: number | null
  mode: SessionMode
}

export const HttpLinguisticVersatilityRepository = {
  async startSession(
    mode: SessionMode = 'guided',
    roundsTotal: number = 5,
    parentId?: string | null,
  ): Promise<StartSessionResponse> {
    const dto = await apiRequest<StartSessionRawDto>(`${PREFIX}/sessions`, {
      method: 'POST',
      body: {
        mode,
        rounds_total: roundsTotal,
        parent_id: parentId ?? null,
      },
    })
    return {
      sessionId: dto.session_id,
      totalRounds: dto.rounds_total,
      questions: dto.prompts.map((p) => ({
        id: p.id,
        text: p.text,
        category: p.category,
        difficulty: p.difficulty,
      })),
    }
  },

  async submitRound(
    sessionId: string,
    roundIndex: number,
    promptId: string | null,
    audio: Blob,
  ): Promise<EvaluateRoundResponse> {
    const fields: Record<string, string> = { round_index: String(roundIndex) }
    if (promptId) fields.prompt_id = promptId
    const dto = await uploadAudio<EvaluateRoundRawDto>(
      `${PREFIX}/sessions/${sessionId}/rounds`,
      audio,
      fields,
    )
    return {
      roundIndex: dto.round_index,
      promptId: dto.prompt_id,
      audioIntelligible: dto.is_audio_intelligible,
      versatilityScore: dto.score,
      vocabularyRichness: dto.vocabulary_richness,
      feedback: dto.feedback || null,
    }
  },

  async finalize(sessionId: string): Promise<SessionDetail> {
    // The finalize endpoint returns a flat summary, not the full detail;
    // call get afterwards to populate rounds for the results view.
    await apiRequest<unknown>(`${PREFIX}/sessions/${sessionId}/finalize`, {
      method: 'POST',
    })
    return this.getSession(sessionId)
  },

  async abandon(sessionId: string): Promise<void> {
    try {
      await apiRequest<void>(`${PREFIX}/sessions/${sessionId}/abandon`, {
        method: 'PATCH',
      })
    } catch (err) {
      // 404 is intentionally swallowed: abandon is fire-and-forget on nav-away.
      if (err instanceof ApiError && err.status === 404) return
      throw err
    }
  },

  async getSession(sessionId: string): Promise<SessionDetail> {
    const dto = await apiRequest<SessionDetailRawDto>(
      `${PREFIX}/sessions/${sessionId}`,
    )
    return {
      id: dto.id,
      mode: dto.metrics.mode,
      totalRounds: dto.metrics.rounds_total,
      completedRounds: dto.metrics.rounds_completed,
      overallScore: dto.score,
      vocabularyRichnessAvg: dto.metrics.vocabulary_richness_avg,
      status: dto.status,
      createdAt: dto.created_at,
      completedAt: dto.ended_at,
      rounds: dto.rounds.map((r) => ({
        roundIndex: r.round_index,
        promptId: r.prompt_id,
        questionText: null,
        versatilityScore: r.score,
        vocabularyRichness: r.vocabulary_richness,
        feedback: null,
        audioIntelligible: r.is_audio_intelligible,
      })),
    }
  },

  async getHistory(): Promise<SessionListItem[]> {
    const dtos = await apiRequest<SessionListItemRawDto[]>(`${PREFIX}/sessions`)
    return dtos.map((d) => ({
      id: d.id,
      mode: d.mode,
      overallScore: d.score,
      status: d.status,
      createdAt: d.started_at,
    }))
  },
}
