import { apiRequest } from '../../../../api/client'
import type {
  AbandonRequestDto,
  AutoStopReasonDto,
  ComposedAudioEvaluationRequestDto,
  ComposedAudioEvaluationResponseDto,
  FinalizeRequestDto,
  FinalizeSessionResponseDto,
  LiveSessionDetailDto,
  LiveSessionListItemDto,
  StartSessionResponseDto,
} from '../dto/LiveSessionDtos'
import type {
  FrameEvaluationResponseDto,
  FrameModuleDto,
} from '../dto/FrameEvaluationDtos'

// Live composition is HTTP-only: the WebSocket multi-dim orchestrator is
// gone. Each component module session is attached to a live root via
// parent_id when its create call accepts it.
export const HttpLiveSessionRepository = {
  async startSession(): Promise<StartSessionResponseDto> {
    return apiRequest<StartSessionResponseDto>('/live/sessions', {
      method: 'POST',
    })
  },

  async finalizeSession(
    sessionId: string,
    autoStopReason: AutoStopReasonDto | null = null,
  ): Promise<FinalizeSessionResponseDto> {
    const body: FinalizeRequestDto =
      autoStopReason !== null ? { auto_stop_reason: autoStopReason } : {}
    return apiRequest<FinalizeSessionResponseDto, FinalizeRequestDto>(
      `/live/sessions/${sessionId}/finalize`,
      { method: 'POST', body },
    )
  },

  async abandonSession(
    sessionId: string,
    stopReason: AbandonRequestDto['stop_reason'] = 'user_stop',
  ): Promise<void> {
    await apiRequest(`/live/sessions/${sessionId}/abandon`, {
      method: 'PATCH',
      body: { stop_reason: stopReason },
    })
  },

  async listSessions(): Promise<LiveSessionListItemDto[]> {
    return apiRequest<LiveSessionListItemDto[]>('/live/sessions')
  },

  async getSession(sessionId: string): Promise<LiveSessionDetailDto> {
    return apiRequest<LiveSessionDetailDto>(`/live/sessions/${sessionId}`)
  },

  // Multipart upload for the composed Gemini call. modules is sent as
  // repeated form fields (modules=muletillas&modules=consistency...) so
  // FastAPI parses it as list[str] natively. The audio filename is
  // synthetic — backend reads the bytes and the content_type, and the
  // name only matters for browser DevTools.
  async evaluateAudio(
    sessionId: string,
    request: ComposedAudioEvaluationRequestDto,
  ): Promise<ComposedAudioEvaluationResponseDto> {
    const form = new FormData()
    const filename = `live-${sessionId}.${request.audio.type.includes('mp4') ? 'mp4' : 'webm'}`
    form.append('audio', request.audio, filename)
    form.append('started_at', request.startedAt)
    if (request.promptText) {
      form.append('prompt_text', request.promptText)
    }
    for (const module of request.modules) {
      form.append('modules', module)
    }
    if (request.facialSummary) {
      // Backend reads this as a JSON string and parses it with the
      // FacialSummaryInput pydantic model; multipart does not have a
      // native nested-object shape so JSON serialization is the
      // simplest contract.
      form.append('facial_summary', JSON.stringify(request.facialSummary))
    }

    return apiRequest<ComposedAudioEvaluationResponseDto, FormData>(
      `/live/sessions/${sessionId}/audio-evaluation`,
      { method: 'POST', body: form },
    )
  },

  // Multipart upload of a 5-8 second audio fragment for in-session
  // strike detection. modules is sent as repeated form fields. The
  // backend returns the per-module response sections that drive the
  // strike counter. Failures (502, timeout) are propagated so the
  // caller can simply drop the frame from the counter.
  async evaluateFrame(
    sessionId: string,
    audio: Blob,
    frameIndex: number,
    modules: FrameModuleDto[],
    evaluatedSoFarSeconds: number,
  ): Promise<FrameEvaluationResponseDto> {
    const form = new FormData()
    const filename = `frame-${sessionId}-${frameIndex}.${
      audio.type.includes('mp4') ? 'mp4' : 'webm'
    }`
    form.append('audio', audio, filename)
    form.append('frame_index', String(frameIndex))
    form.append('evaluated_so_far_seconds', String(evaluatedSoFarSeconds))
    for (const module of modules) {
      form.append('modules', module)
    }

    return apiRequest<FrameEvaluationResponseDto, FormData>(
      `/live/sessions/${sessionId}/evaluate-frame`,
      { method: 'POST', body: form },
    )
  },
}
