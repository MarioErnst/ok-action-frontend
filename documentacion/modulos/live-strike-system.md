# Sistema de Strikes en Sesión Live — Frontend

A partir de la branch `feature/live_corten` (mayo 2026), el strike system del
flujo Sesión Live (`/sesion-libre`) corre sobre un WebSocket directo al backend
que orquesta Gemini Live (function calling). Las muletillas, errores de
pronunciación y errores de acentuación se detectan casi en tiempo real y cortan
la sesión al **primer** evento válido. La expresión facial sigue evaluándose
100% en cliente con MediaPipe.

Este archivo cubre los cambios frontend. El detalle del lado backend vive en el
mismo archivo del repo `ok-action-backend`.

## 1. Cambios respecto al pipeline anterior

| Aspecto | Antes (HTTP por frame) | Ahora (WebSocket continuo) |
|---|---|---|
| Transporte | `POST /live/sessions/:id/evaluate-frame` con blob webm/mp4 de 5-8s | `WS /live/sessions/:id/stream` con chunks PCM 16k mono cada 100ms |
| Modelo | `gemini-2.5-flash` con response_schema | `gemini-live-2.5-flash-native-audio` con function tools |
| Detección | Polling por frame con scores 0-100 + listas | Tool call por error con `transcript_snippet` requerido |
| Umbral strike | 2 strikes por categoría | 1 strike por categoría (corten inmediato) |
| Calibración de ruido | Sí (`noiseCalibrator.ts`) | No (Gemini Live tiene VAD propio) |
| Detector de pausas | Sí (`pauseDetector.ts`) | No (idem) |
| Recorder de frames | Sí (`frameRecorder.ts`) | No (streamer PCM continuo) |
| Persistencia en vivo | Ninguna | Ninguna (composed-eval al cierre sigue siendo fuente única) |

## 2. Estructura de directorios

```
src/features/live-session/
├── domain/
│   └── StreamingEvent.ts                NUEVO: tipos para strikes recibidos por WS
├── infrastructure/
│   ├── dto/LiveStreamDtos.ts            NUEVO: contrato WS server -> client
│   └── repositories/HttpLiveSessionRepository.ts (sin evaluateFrame)
├── services/
│   ├── liveStreaming/
│   │   ├── audioStreamer.ts             NUEVO: PCM 16k mono con AudioWorklet / fallback ScriptProcessor
│   │   └── liveStreamSocket.ts          NUEVO: cliente WS
│   └── emotionMonitor/                  intacto, sigue siendo client-side
└── presentation/
    └── hooks/
        ├── useLiveStreamingStrikes.ts   NUEVO: counter con threshold 1
        └── useLiveSession.ts            ajustado: usa los dos nuevos servicios
```

Los archivos eliminados del flujo anterior:
- `services/audioFraming/frameRecorder.ts`
- `services/audioFraming/pauseDetector.ts`
- `services/audioFraming/noiseCalibrator.ts`
- `presentation/hooks/useFrameStrikes.ts`
- `infrastructure/dto/FrameEvaluationDtos.ts`

## 3. Pipeline en vivo

1. Usuario tilda módulos en `DimensionSelector` (muletillas, pronunciación,
   acentuación, expresión facial).
2. Click en "Comenzar" dispara `useLiveSession.start()`:
   - Si hay al menos un módulo de audio, pide el mic, abre `POST /live/sessions`
     y guarda el `session_id`.
   - Si hay facial, inicializa `LiveFaceLoop` + acumulador de baseline.
3. Fase `calibrating` (2 segundos cosméticos para audio + tiempo necesario para
   baseline facial). El streaming hacia Gemini no inicia todavía.
4. Fase `recording`:
   - Crea `LiveStreamSocket` y abre la WS. La WS recibe `{type:"start", modules}`
     con la unión `muletillas`, `pronunciation`, `accentuation`.
   - Tras `{type:"ready"}`, arranca `LiveAudioStreamer` que toma el MediaStream
     y emite chunks PCM 16 kHz cada 100 ms. Cada chunk se envía como frame
     binario por la WS.
   - En paralelo sigue corriendo el MediaRecorder principal que graba el audio
     completo (webm/mp4) para el composed eval final.
   - Cada `{type:"strike", category, word, transcript_snippet, severity, ...}`
     que llega se entrega a `useLiveStreamingStrikes.registerStrike`.
5. El effect que mira `strikes.shouldStop` dispara `triggerStop('auto_stop_strikes')`
   en cuanto cualquier counter llega a 1. La WS se cierra y el audio completo se
   sube al composed-eval (`POST /live/sessions/:id/audio-evaluation`) para
   persistir las hijas con sus scores finales.

## 4. Wire format

### Server -> Client (JSON)

```ts
type ServerMessage =
  | { type: 'ready' }
  | {
      type: 'strike'
      category: 'muletillas' | 'pronunciation' | 'accentuation'
      word: string
      transcript_snippet: string
      severity: 'low' | 'medium' | 'high'
      received_at_ms: number
    }
  | { type: 'session_ended' }
  | { type: 'error', reason: string }
```

`transcript_snippet` es la evidencia que el modelo escuchó. El backend ya
descarta tool calls sin snippet, así que el cliente no vuelve a filtrar.

### Client -> Server

- Frame binario `Uint8Array` con PCM16 little-endian 16 kHz mono. El streamer
  los emite cada 100 ms.
- Texto JSON `{type:"start", modules:[...]}` al abrir.
- Texto JSON `{type:"end"}` al cerrar voluntariamente.

## 5. Streaming de audio

`LiveAudioStreamer` resamplea el output del micrófono (típicamente 44.1/48 kHz)
a 16 kHz mono y cuantiza a PCM16. Usa AudioWorklet cuando el navegador lo
soporta (iOS Safari 14.5+, Android Chrome, desktop). En navegadores que no
exponen `audioWorklet.addModule` cae automáticamente a `ScriptProcessorNode`,
deprecado pero funcional.

El graph se mantiene vivo conectándose a un `GainNode` con gain 0 enlazado al
destination, patrón estándar para evitar que el browser garbage-collectee el
processor.

## 6. Threshold 1 y razón del cambio

- El backend ya aplica filtros (transcript_snippet mínimo, severity normalizada)
  antes de emitir un strike. Cualquier evento que llega al cliente es ya un
  positivo confiable.
- Pedagógicamente, el corten tiene valor sólo si el alumno asocia el error con
  su acción inmediata. Latencia error→corten cae de 5-15 s a ~500 ms-1.5 s.
- Falsos positivos: aceptamos el riesgo. Si pasan a ser un problema, el primer
  ajuste será filtrar `severity === 'low'` en el hook antes de hacer "shouldStop".

## 7. Lo que no cambió

- `LiveSessionPage` y los organismos (`DimensionSelector`,
  `LiveRecordingScreen`, `SessionSummaryScreen`,
  `StoppedTransitionOverlay`, `StrikeFeedbackBody`) siguen igual visualmente.
- `useEmotionStop` (corten por expresión facial sostenida) intacto. Sigue siendo
  client-side puro.
- Composed eval final (`HttpLiveSessionRepository.evaluateAudio`) intacto.
  Sigue siendo la única fuente de verdad para BD.
- Modules standalone (fonación, volumen, pausas, precisión, versatilidad,
  fluidez, consistencia) no se tocan.

## 8. Responsive y multiplataforma

- `AudioWorkletNode` requiere iOS 14.5+. Fallback automático a
  `ScriptProcessorNode` para iOS Safari viejo.
- El stream se abre solo cuando el usuario aprieta "Comenzar" (gesture del
  usuario, requisito de `AudioContext` en iOS).
- WS sobre WSS en producción (regla del entorno; `VITE_WS_URL` configura el
  host).
- Touch targets 44×44, 100dvh, `playsInline` en `<video>` ya cumplidos en
  `LiveRecordingScreen` y no se tocan.

## 9. Pendientes

- Tests del hook `useLiveStreamingStrikes` con un mock de eventos.
- Indicador visual sutil cuando el WS se reconecta (hoy se loguea a consola y
  la UI no avisa; nadie está midiendo reconexiones en producción todavía).
- Filtro opcional de severidad si los falsos positivos suben.
