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

const API_BASE_URL =
  (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ??
  import.meta.env.VITE_API_URL ??
  '/api'

const PREFIX = '/linguistic-versatility'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

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
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }
    return res.json() as Promise<T>
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
    const dto = await jsonRequest<StartSessionRawDto>(`${PREFIX}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        rounds_total: roundsTotal,
        parent_id: parentId ?? null,
      }),
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
    await jsonRequest<unknown>(`${PREFIX}/sessions/${sessionId}/finalize`, {
      method: 'POST',
    })
    return this.getSession(sessionId)
  },

  async abandon(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}${PREFIX}/sessions/${sessionId}/abandon`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    if (!res.ok && res.status !== 204) {
      // 404 is intentionally swallowed: abandon is fire-and-forget on nav-away.
      throw new Error(`HTTP ${res.status}`)
    }
  },

  async getSession(sessionId: string): Promise<SessionDetail> {
    const dto = await jsonRequest<SessionDetailRawDto>(
      `${PREFIX}/sessions/${sessionId}`,
      { method: 'GET' },
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
    const dtos = await jsonRequest<SessionListItemRawDto[]>(
      `${PREFIX}/sessions`,
      { method: 'GET' },
    )
    return dtos.map((d) => ({
      id: d.id,
      mode: d.mode,
      overallScore: d.score,
      status: d.status,
      createdAt: d.started_at,
    }))
  },
}
