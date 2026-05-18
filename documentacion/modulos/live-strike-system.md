# Sistema de Strikes en Sesión Live — Frontend

A partir de la branch `feature/live_phonation_loudness` (mayo 2026), la sesión
live tiene **cuatro categorías de corten en vivo**, todas client-side excepto
muletillas:

- **muletillas**: vía WebSocket a **AssemblyAI Universal-3 Pro Streaming** +
  matcher de diccionario español en el backend. Único strike que llega por WS.
- **emotion**: clasificador facial local con MediaPipe FaceLandmarker + lógica
  de emoción sostenida.
- **loudness**: 3 s continuos en banda `clipping` del clasificador de bandas
  (`useLiveLoudness`).
- **phonation**: 5 saltos de pitch (`>50 Hz`) dentro de una ventana de 10 s
  desde el `AudioWorklet` (`useLivePhonation`).

Pronunciación y acentuación fueron retiradas de la sesión live en la misma
branch (su evaluación ahora corre solo en sus páginas standalone).

Este archivo cubre los cambios frontend; el lado backend vive en el mismo
nombre en `ok-action-backend/documentacion/modulos/live-strike-system.md`.

## 1. Cambios respecto a versiones anteriores

| Aspecto | `feature/live_corten` (Gemini) | `feature/live_assemblyai_muletillas` | `feature/live_phonation_loudness` |
|---|---|---|---|
| Motor backend para muletillas | Gemini Live + function tools | AssemblyAI streaming + dictionary matcher | igual |
| Módulos con strike en vivo (WS) | muletillas, pron, acc | **solo muletillas** | **solo muletillas** |
| Categorías de corten totales | strikes + emotion | strikes + emotion | strikes + emotion + **loudness** + **phonation** |
| Módulos client-side | facial | facial | facial + **phonation** + **loudness** |
| Riesgo de alucinación | Sí | No | No |
| Calibración | 1 fase (ruido) | 1 fase (ruido) | **2 fases**: ruido + voz (si loudness está activo) |

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

`LiveStreamModule` sigue como literal único — el WebSocket es solo para
muletillas:

```ts
export type LiveStreamModule = 'muletillas'
```

`LiveModule` (los módulos seleccionables en `DimensionSelector`) cambió en
`feature/live_phonation_loudness`:

```ts
export type LiveModule =
  | 'muletillas'
  | 'phonation'
  | 'loudness'
  | 'facial_expression'
```

`StopCategory` en `useLiveSession.ts` se amplió a las cuatro categorías de
corten en vivo:

```ts
export type StopCategory =
  | 'muletillas'
  | 'emotion'
  | 'loudness'
  | 'phonation'
```

`useLiveStreamingStrikes` sigue exponiendo solo `muletillaCount` (más
`events`, `shouldStop`, `markRecordingStart`, `registerStrike`, `reset`).
Las otras tres categorías viven en sus hooks específicos: `useEmotionStop`,
`useLiveLoudness`, `useLivePhonation`. Cada uno expone su propio
`shouldStop` y su `triggerStop` invoca el `auto_stop_*` correspondiente.

## 4. Pipeline en vivo

1. Usuario tilda módulos en `DimensionSelector`. Cualquier combinación es
   válida; los cuatro módulos disponibles son muletillas, phonation, loudness,
   facial_expression. Si tilda loudness, el selector le pide elegir un preset
   (default si no eligió).
2. `useLiveSession.start()`:
   - Abre micrófono + `POST /live/sessions` + arranca `LiveFaceLoop` si
     facial está activo.
   - Si phonation o loudness están activos, construye el `AudioWorkletNode`
     que produce frames `{ hz, db }` cada ~50 ms y comparte el stream con el
     monitor de voz para no abrir el micrófono dos veces.
   - **Pre-warm**: construye `LiveStreamSocket` y dispara `socket.open()` en
     paralelo a la calibración (sigue valiendo el mismo patrón anti
     cold-start aplicado al WS de AssemblyAI vía nuestro backend).
3. Fase `calibrating`:
   - **mic_noise** (~3 s): captura ruido de fondo para el clasificador de
     bandas de loudness y el baseline del facial classifier.
   - **voice_baseline** (~3 s, solo si loudness está activo): el usuario habla
     a su volumen normal y el clasificador ajusta las bandas a `noiseFloor + 25 dB`
     como referencia mínima de voz.
   - **finalizing**: aplica los thresholds calculados y limpia el estado
     transitorio antes de pasar a `recording`.
4. Fase `recording`:
   - `MediaRecorder` graba el audio completo para el composed-eval del cierre.
   - `LiveAudioStreamer` emite PCM 16k mono cada 100 ms al `liveStreamSocket`
     (solo si muletillas está tildado).
   - `useLivePhonation` consume frames del worklet, mantiene una ventana
     rodante de saltos en los últimos 10 s y dispara `auto_stop_phonation`
     cuando alcanza 5.
   - `useLiveLoudness` clasifica cada frame en silence/too-low/optimal/too-high/clipping,
     mantiene `clippingStreakMs` y dispara `auto_stop_loudness` a los 3 s
     continuos de clipping.
   - `useEmotionStop` dispara `auto_stop_emotion` con la lógica de emoción
     sostenida sobre el clasificador local.
   - Cada strike `{type: "strike", category: "muletillas", ...}` se entrega a
     `useLiveStreamingStrikes.registerStrike` y dispara `auto_stop_strikes`.
5. Cualquier auto-stop pasa por `triggerStop(reason)`: cierra el WS, finaliza
   la grabación, sube al composed-eval con los `phonation_summary` /
   `loudness_summary` correspondientes y muestra `stopped_transition` →
   `stopped_feedback`.

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

## 6. Lo que cambió en pantalla

- `DimensionSelector` ahora ofrece muletillas + phonation + loudness + facial,
  y muestra un dropdown de preset cuando loudness está tildado.
- `LiveRecordingScreen` renderiza `LivePhonationMeter` y/o `LiveLoudnessMeter`
  según los módulos tildados, con un grid adaptativo 1 o 2 columnas.
- `StoppedTransitionOverlay` agrega copias para `loudness` y `phonation`.
- `StrikeFeedbackBody` agrega tabs para fonación y volumen con su detalle
  cuando esos módulos estuvieron activos.
- `CalibrationScreen` adapta su copy según `mic_noise`, `voice_baseline` o
  `finalizing`.
- `SessionSummaryScreen` agrega cards para fonación y volumen con sub-scores
  y feedback contextual.

## 7. Lo que no cambió

- `useEmotionStop` (corten por expresión facial sostenida) intacto.
- Composed-eval final (`HttpLiveSessionRepository.evaluateAudio`) extendido
  con `phonationSummary` y `loudnessSummary` opcionales, pero el contrato
  base es el mismo (multipart con `audio`, `modules`, `started_at`).
- Modules standalone (pronunciación, acentuación, pausas, precisión,
  versatilidad, fluidez, consistencia) sin cambios.
- Pre-warm + métricas debug del `LiveStreamSocket` se mantienen.

## 8. Responsive y multiplataforma

Sin cambios estructurales — la capa de captura de audio sigue siendo única:
- `AudioWorkletNode` con fallback `ScriptProcessorNode` para iOS Safari viejo.
- Stream solo se abre con gesture del usuario al apretar "Comenzar".
- El mismo `MediaStream` alimenta al `AudioWorklet` de pitch/dB y al
  `LiveAudioStreamer` que abastece al WS de AssemblyAI; no se abre el
  micrófono dos veces (regla dura para iOS).
- WS sobre WSS en producción.
- Touch targets 44×44, 100dvh, `playsInline` en `<video>` ya cumplidos.
- `LiveRecordingScreen` adapta el layout entre 1 y 2 columnas según la
  combinación de meters activos para no apilar widgets innecesariamente.

## 9. Pendientes

- Métricas reales de falsos positivos en sesiones de prueba con audio
  espontáneo.
- Voz baseline real (hoy se usa un offset fijo `noiseFloor + 25 dB`); cuando
  se implemente una baseline medida, simplificar el voice_baseline step para
  consumirla en lugar del offset.
- Aplicar la migración Alembic `0009_add_live_audio_auto_stop_reasons` en
  Cloud SQL una vez revisada en local.
