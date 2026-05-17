# Sistema de Strikes en Sesión Live — Frontend

A partir de la branch `feature/live_assemblyai_muletillas` (mayo 2026), el
único módulo que dispara corten en vivo desde el WebSocket es **muletillas**,
detectadas por **AssemblyAI Universal-3 Pro Streaming** + matcher de diccionario
español en el backend. Pronunciación y acentuación siguen en la sesión live
pero su evaluación corre al cierre via composed-eval; ya no provocan corten
en tiempo real. Expresión facial sigue con su propio corten client-side via
MediaPipe.

Este archivo cubre los cambios frontend; el lado backend vive en el mismo
nombre en `ok-action-backend/documentacion/modulos/live-strike-system.md`.

## 1. Cambios respecto a la versión anterior (Gemini Live)

| Aspecto | Anterior (`feature/live_corten` con Gemini) | Ahora (`feature/live_assemblyai_muletillas`) |
|---|---|---|
| Motor backend | Gemini Live + function tools | AssemblyAI streaming + dictionary matcher |
| Módulos con strike en vivo | muletillas, pronunciation, accentuation | **solo muletillas** |
| Riesgo de alucinación | Sí, el modelo inventaba muletillas | No, el matcher solo emite si la palabra aparece literal |
| Umbral strike | 1 | 1 (sin cambios) |
| Latencia | ~2 s vía pulser de activity | ~1-2 s vía turn final natural |
| Cleanup obligatorio | `Terminate` Gemini | `Terminate` AssemblyAI (idéntica criticidad) |

## 2. Estructura de directorios

Sin cambios estructurales — el árbol es el mismo que cuando se introdujo el
streaming en `feature/live_corten`. Lo que cambia es la narrowing de tipos y
la simplificación del strike counter:

```
src/features/live-session/
├── domain/
│   └── StreamingEvent.ts                tipos para strikes recibidos por WS
├── infrastructure/
│   ├── dto/LiveStreamDtos.ts            contrato WS server → client
│   └── repositories/HttpLiveSessionRepository.ts
├── services/
│   ├── liveStreaming/
│   │   ├── audioStreamer.ts             PCM 16k mono via AudioWorklet
│   │   └── liveStreamSocket.ts          cliente WS
│   └── emotionMonitor/                  intacto, client-side
└── presentation/
    └── hooks/
        ├── useLiveStreamingStrikes.ts   counter único de muletillas
        └── useLiveSession.ts            LIVE_STREAM_MODULES = ['muletillas']
```

## 3. Tipos narrowed

`LiveStreamModule` quedó como literal único:

```ts
export type LiveStreamModule = 'muletillas'
```

Esto fuerza a cada consumidor a saber que cualquier strike WS es siempre una
muletilla. `StreamingStrikeCategory` derivado queda igual.

`StopCategory` en `useLiveSession.ts`:

```ts
export type StopCategory = 'muletillas' | 'emotion'
```

`useLiveStreamingStrikes` expone solo `muletillaCount` (más `events`,
`shouldStop`, `markRecordingStart`, `registerStrike`, `reset`).

## 4. Pipeline en vivo

1. Usuario tilda módulos en `DimensionSelector`. Cualquier combinación es
   válida; muletillas + pron/acc/facial solo determina qué evalúa el
   composed-eval al cierre.
2. `useLiveSession.start()`:
   - Si hay módulo de audio, abre micrófono + `POST /live/sessions` + arranca
     `LiveFaceLoop` si facial está activo.
   - **Pre-warm**: construye `LiveStreamSocket` y dispara `socket.open()` en
     paralelo a la calibración (sigue valiendo el mismo patrón anti
     cold-start, ahora aplicado al WS de AssemblyAI vía nuestro backend).
3. Fase `calibrating`: union del timer cosmético + facial baseline + ready
   WS + chunk de silencio de warmup.
4. Fase `recording`:
   - `MediaRecorder` graba el audio completo para el composed-eval del cierre.
   - `LiveAudioStreamer` emite PCM 16k mono cada 100 ms al `liveStreamSocket`.
   - Cada `{type: "strike", category: "muletillas", word, transcript_snippet,
     severity, received_at_ms}` que llega es entregado a
     `useLiveStreamingStrikes.registerStrike`.
   - `strikes.markRecordingStart(Date.now())` se llama justo antes del flip
     a `recording` para anclar los timestamps al audio grabado.
5. El effect `strikes.shouldStop` dispara `triggerStop('auto_stop_strikes')`
   al primer strike. La WS se cierra (mandando `end` para que el supervisor
   pueda terminar la sesión AssemblyAI limpia) y el audio se sube al
   composed-eval.

## 5. Wire format

### Server → Client (JSON)

```ts
type ServerMessage =
  | { type: 'ready' }
  | {
      type: 'strike'
      category: 'muletillas'
      word: string
      transcript_snippet: string
      severity: 'low'   // por ahora siempre 'low'; el campo queda por extensibilidad
      received_at_ms: number
    }
  | { type: 'session_ended' }
  | { type: 'error', reason: string }
```

`received_at_ms` es epoch wall-clock. El hook lo resta contra el `Date.now()`
capturado al inicio de la grabación para producir un offset coherente dentro
del audio del usuario.

### Client → Server

- Frame binario `Uint8Array` con PCM16 little-endian 16 kHz mono cada 100 ms.
- JSON `{type: "start", modules: ["muletillas"]}` al abrir.
- JSON `{type: "end"}` al cerrar voluntariamente.

## 6. Lo que no cambió

- `LiveSessionPage` y los organismos (`DimensionSelector`,
  `LiveRecordingScreen`, `SessionSummaryScreen`, `StoppedTransitionOverlay`,
  `StrikeFeedbackBody`) siguen visualmente igual.
- `useEmotionStop` (corten por expresión facial sostenida) intacto.
- Composed-eval final (`HttpLiveSessionRepository.evaluateAudio`) intacto.
- Modules standalone (fonación, volumen, pausas, precisión, versatilidad,
  fluidez, consistencia) sin cambios.
- Pre-warm + métricas debug del `LiveStreamSocket` se mantienen.

## 7. Responsive y multiplataforma

Sin cambios — la capa de captura de audio es la misma:
- `AudioWorkletNode` con fallback `ScriptProcessorNode` para iOS Safari viejo.
- Stream solo se abre con gesture del usuario al apretar "Comenzar".
- WS sobre WSS en producción.
- Touch targets 44×44, 100dvh, `playsInline` en `<video>` ya cumplidos.

## 8. Pendientes

- Métricas reales de falsos positivos en sesiones de prueba con audio
  espontáneo.
- Si los counters de pron/acc se necesitan en el frontend para algún
  componente futuro, agregarlos via composed-eval response (no via WS).
