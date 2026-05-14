# Sistema de Strikes en Sesión Live — Frontend

Rediseño del flujo de Sesión Live (`/sesion-libre`) que agrega evaluación por frames en tiempo real con un sistema de strikes y detención automática del usuario tras tres errores acumulados (o tras una expresión facial negativa sostenida durante cinco segundos).

Esta documentación es el archivo de referencia central de la feature. La documentación previa de Sesión Libre (`sesion-libre.md`) se actualiza para reflejar los módulos nuevos y apunta acá para los detalles del strike system.

## 1. Cambios en alto nivel respecto a la Sesión Live actual

| Aspecto | Antes | Después |
|---|---|---|
| Módulos composables | muletillas, acentuación, pronunciación, **consistencia** | muletillas, acentuación, pronunciación, **expresión facial** |
| Evaluación durante grabación | Ninguna (todo post-stop) | Frames de 5–8s enviados a Gemini durante la sesión + clasificación facial cada ~67ms |
| Detección de errores en vivo | No existía | Sí (strike system con contador global de 3) |
| Detención automática del usuario | Solo por timeout 5 min | Timeout 5 min **o** 3 strikes audio **o** 5s seguidos de emoción negativa |
| Score final | Composed Gemini sobre audio entero | Mismo: composed Gemini sobre audio entero (truncado si fue corte por strikes) |

## 2. Selección de módulos y comportamiento del strike system

El usuario sigue tildando un subset de 1 a 4 módulos en `DimensionSelector`. Cada módulo seleccionado activa sus triggers correspondientes:

| Módulo | Trigger de strike | Cap por frame |
|---|---|---|
| muletillas | Cada muletilla detectada por Gemini en el frame | Sin cap (un frame con 5 muletillas suma 5 strikes) |
| acentuación | Algún score del frame (`pronunciation_score`, `rhythm_score`, `intonation_score`, `stress_score`) < 55 | 1 por frame |
| pronunciación | Algún score del frame (`vowel_score`, `consonant_score`, `fluency_score`, `intelligibility_score`) < 55 | 1 por frame |
| expresión facial | **No suma strikes**. Si pasa ≥5s seguidos con la misma emoción negativa con confianza suficiente → corta de inmediato sin acumular | n/a |

Contador **global** (no por módulo): los strikes de los 3 módulos audio se suman al mismo bucket. A las 3 unidades acumuladas, la sesión se detiene.

**El contador NUNCA se muestra al usuario durante la grabación.** Lo único que ve es la pantalla de "tu sesión fue detenida" al cruzar el umbral.

## 3. Lifecycle visual de la sesión live nueva

```
selection → calibrating → recording → (auto_stop | user_stop | time_limit) → stopped_feedback
                                   ↘
                                    evaluating → summary
```

| Fase | Qué hace |
|---|---|
| `selection` | Usuario tilda módulos. Mismo `DimensionSelector` que hoy, con `expresion-facial` en lugar de `consistencia`. |
| `calibrating` | 2 segundos midiendo el RMS de ruido ambiental con el micro abierto. UI muestra "Calibrando audio, mantente en silencio" con un anillo de progreso. |
| `recording` | Grabación activa con el cuádruple loop: MediaRecorder full audio, RMS rolling para pause detection y framing, emotion classifier (si está tildada `expresion-facial`), HTTP de frames hacia el backend. |
| `evaluating` | Tras stop manual o timeout 5 min: se manda el audio completo al endpoint composed para obtener el score final. |
| `summary` | Pantalla actual de scores por módulo. |
| `stopped_feedback` | Pantalla nueva post-corte automático: detalle rico de muletillas detectadas, scores por módulo, audio reproducible con marcadores, qué disparó la detención. |

## 4. Audio framing

### 4.1 Calibración inicial (`services/audioFraming/noiseCalibrator.ts`)

Captura 2 segundos del stream antes de que arranque el timer real. Calcula:

- `noise_floor_rms`: media del RMS por bloque de 100ms durante los 2s.
- `noise_floor_std`: desvío estándar del mismo conjunto (para detectar drift).

El resultado se guarda en memoria para el resto de la sesión y se usa como sanity check del detector de pausas. El detector usa principalmente un **umbral relativo** (–15 dB respecto a la media móvil del último segundo) pero descarta candidatos de pausa que estén más de 6 dB por encima del noise floor calibrado (si el "silencio" detectado está muy por encima del piso, es ruido, no pausa).

### 4.2 Detección de pausas (`services/audioFraming/pauseDetector.ts`)

Worker o función pura que recibe samples del `AnalyserNode` y emite eventos `pause_detected` cuando:

1. La media móvil del RMS sobre 200ms cae al menos 15 dB respecto a la media móvil sobre el último segundo de habla.
2. El valor actual está dentro de 6 dB del `noise_floor_rms`.
3. El frame en curso ya tiene al menos 5 segundos.

Si pasan 8 segundos sin pausa detectable, emite `force_cut` igual.

### 4.3 Recorder de frames (`services/audioFraming/frameRecorder.ts`)

Captura el stream del MediaRecorder **en paralelo al recorder principal** (que sigue grabando el audio completo sin cortes para la evaluación final). El recorder de frames:

- Inicia un MediaRecorder secundario al arrancar cada frame.
- Detiene y emite el blob al recibir `pause_detected` o `force_cut`.
- Incluye un overlap de 500ms con el frame anterior: los últimos 500ms del blob anterior se prependen al frame siguiente al construir el payload para Gemini. Esto evita partir muletillas en el límite del corte.
- Numera cada frame con `frame_index` correlativo, empezando en 0.

El blob de cada frame se envía al backend vía `POST /api/live/{session_id}/evaluate-frame` con `frame_index`, `audio` (multipart), `modules` (subset del usuario), `evaluated_so_far_seconds` (para que Gemini sepa en qué momento de la sesión está el frame).

## 5. Emotion monitoring (cuando `expresion-facial` está tildada)

### 5.1 Lazy load del clasificador

Se carga al entrar a la fase `recording`, no antes. CLAUDE.md exige modelos lite + lazy load. Reutilizamos el clasificador que ya usa el módulo standalone `facial_expression` y limitamos el loop a 15 fps (CLAUDE.md exige ≤15 fps en móvil para no sobrecalentar).

### 5.2 Suavizado (`services/emotionMonitor/emotionSmoother.ts`)

Aplica un **confidence threshold sustained**:

- Cada predicción del clasificador trae `{emotion, confidence}`.
- Ventana móvil de 1 segundo (≈15 frames a 15fps).
- Una emoción E "cuenta como sostenida" en una ventana cuando ≥80% de los frames de la ventana devolvieron `emotion === E` con `confidence ≥ 65%`.

Sin suavizado, los clasificadores oscilan entre emociones cercanas (angry/sad) y el sostén nunca llega a 5 segundos.

### 5.3 Detector de emoción sostenida (`services/emotionMonitor/sustainedDetector.ts`)

Recibe el stream de "emoción dominante en ventana" del smoother. Mantiene un acumulador por emoción:

- Si la dominante cambia, resetea todos los acumuladores.
- Si la dominante es una emoción **disparadora** (`angry`, `sad`, `fearful`, `disgusted`), incrementa su acumulador.
- Al cruzar 5 segundos, emite `emotion_stop_triggered(emotion)`.

Emociones que **no** disparan: `happy`, `surprised`, `neutral`. Razón: para un orador, sonreír sostenido o expresar sorpresa es positivo o neutral, no error.

## 6. Hooks de presentación

### 6.1 `useFrameStrikes`

Centraliza la lógica del contador global de strikes.

```ts
type UseFrameStrikes = {
  strikeCount: number;          // 0..3 — interno, NO se rendea
  events: StrikeEvent[];        // historial completo, va a la pantalla de feedback
  shouldStop: boolean;          // true cuando strikeCount >= 3
  registerFrame: (response: FrameEvaluation) => void;
  reset: () => void;
}
```

Al recibir la respuesta del backend por frame:

- Suma `total_muletillas` al contador (sin cap).
- Si `min(scores.accentuation) < 55`, suma 1 (cap por frame).
- Si `min(scores.pronunciation) < 55`, suma 1 (cap por frame).
- Guarda el `StrikeEvent` en el historial con `{frame_index, module, kind, timestamp_ms, detail}`.
- Devuelve `shouldStop` para que el hook que orquesta decida cortar.

### 6.2 `useEmotionStop`

Wraps al detector de emoción sostenida y expone:

```ts
type UseEmotionStop = {
  triggered: { emotion: EmotionName; startedAt: number } | null;
  reset: () => void;
}
```

### 6.3 `useLiveSession` (refactor mayor)

Se reescribe para orquestar:

- Calibración inicial (`calibrating` phase).
- Doble MediaRecorder: full audio + frame-cut audio.
- Pause detector + frame recorder loop.
- Emotion monitor loop (solo si `expresion-facial` tildada).
- Stop por user, timeout, strikes, emoción.
- Selección del stop_reason correcto al cerrar.

## 7. UI nueva

### 7.1 Fase `calibrating`

Pantalla simple: anillo de progreso de 2 segundos con texto "Calibrando audio. Mantente en silencio." Al terminar, transición fade-in a `recording`.

### 7.2 Fase `recording` (extensión)

Sin counter de strikes visible. Sin avisos cuando hay strike. La única señal posible al usuario es la onda de audio (waveform) que ya existe. Cambio funcional: si está tildada `expresion-facial`, también se renderiza el `<video>` con `autoPlay muted playsInline` (atributos obligatorios en iOS).

### 7.3 Fase `stopped_feedback` (nueva, organismo `StrikeFeedbackPage`)

Pantalla rica con:

| Sección | Contenido |
|---|---|
| Header | "Tu sesión fue detenida" + razón en español ("Tres muletillas detectadas" / "Sostuviste una expresión de enojo durante 5 segundos") |
| Reproductor | Audio completo de la sesión con marcadores temporales en cada strike. Tap en un marcador salta a ese momento. |
| Tabs por módulo | Una pestaña por módulo tildado. Cada pestaña muestra los eventos detectados de ese módulo. |
| Lista detallada muletillas | Palabra + timestamp + severidad. Tap en una palabra reproduce ese fragmento. |
| Lista detallada acent/pron | Score por frame que disparó strike, con feedback de Gemini. |
| Highlights de transcripción | Si la respuesta del composed final incluye transcripción (extender prompt), las muletillas se resaltan en línea. |
| Scores finales por módulo | Igual al `summary` actual. |
| Acciones | Botones: "Reintentar", "Ir al dashboard", "Cerrar". |

### 7.4 Modal/overlay del momento del corte

Antes de mostrar `StrikeFeedbackPage`, una pantalla intermedia de ~2 segundos: backdrop blur, animación de fade-in del icono + mensaje "Tu sesión fue detenida". Después fade-out hacia la pantalla rica. Esto evita el corte abrupto.

## 8. Responsive y multiplataforma

CLAUDE.md exige iOS Safari + Android Chrome + desktop. Reglas críticas aplicadas:

- `100dvh` en pantallas full-screen (no `100vh`).
- `playsInline` + `muted` + `autoPlay` en el `<video>` de la cámara.
- HTTPS en producción (ya garantizado por Cloud Run).
- Touch targets ≥ 44×44 px en todos los controles del feedback page.
- Sin dependencia de `:hover` como única señal de interactividad.
- `pb-safe` (`env(safe-area-inset-bottom)`) en pantalla `recording` y `stopped_feedback`.

Layouts:

| Breakpoint | StrikeFeedbackPage |
|---|---|
| Móvil (`<sm`) | Stack vertical: header, reproductor full-width, tabs scrollables horizontales, lista debajo. Padding `p-4`. |
| Tablet (`sm-md`) | Header + reproductor full-width, debajo grid 1 col con tabs como pills. Padding `p-6`. |
| Desktop (`md+`) | Sidebar izquierda con tabs verticales, contenido principal a la derecha. Padding `p-8`. Max-width 1200px centrado. |

Para `recording` con cámara activa (módulo expresión facial tildado):

| Orientación | Layout |
|---|---|
| Portrait móvil | Stack vertical: cámara arriba (aspect-ratio 4:3), waveform debajo, controles abajo. |
| Landscape móvil / tablet | Side-by-side: cámara izquierda, panel de info derecha. |
| Desktop | Side-by-side fijo, cámara ~60% ancho. |

## 9. Performance y batería

- Loop del emotion classifier limitado a 15 fps en todos los dispositivos (no solo móvil), tal como el módulo standalone.
- Al activar la cámara, **drop** del fps del waveform de audio a 30 (era 60) para no competir por CPU.
- MediaRecorder con `audio/mp4` en iOS, `audio/webm; codecs=opus` elsewhere (detección con `MediaRecorder.isTypeSupported` antes de instanciar). Para el frame recorder usamos el mismo MIME pero con `timeslice` no, sino `stop()` y `new MediaRecorder()` por frame.
- Frames se mandan en paralelo (no se espera respuesta para arrancar el siguiente). Concurrencia limitada a 3 in-flight; si se acumulan más por backpressure, se descartan los más viejos (mejor perder un strike que congelar la UI).

## 10. Decisiones de diseño que vale la pena justificar

- **No se persiste el detalle por frame en BD**: el score oficial sale del composed final sobre el audio completo. Los frames son herramienta de detección de strikes y se descartan al cerrar la sesión. Esto evita complicar el schema y mantiene la lógica de evaluación final intacta.
- **Counter oculto al usuario**: probado en domain knowledge — un counter visible empeora el desempeño del orador por presión. Mejor que sea sorpresa.
- **Triple loop (pause/frame/emotion) en cliente**: alternativa era streaming por websocket al backend. Descartado porque (a) ya estamos en HTTP puro, (b) websocket en Cloud Run requiere config extra (`min-instances`, `concurrency`), (c) cliente puede tirar 60 requests sin problema.
- **Calibración 2s**: balance entre suficiente data para una media estable y no aburrir al usuario. Menor que eso da std muy alto; mayor se siente eterno.
- **Strike global vs por módulo**: el bucket único refleja mejor "tres errores totales" en el sentido del usuario. Si fueran tres por módulo, una sesión podría rackear 9 errores antes de cortar — pierde el sentido pedagógico.
- **Expresión facial dispara directo sin contador**: la emoción sostenida ya es por sí misma un evento "largo" (5 segundos). Acumularla con muletillas (eventos puntuales de < 1s) no es comparable.
- **Pantalla intermedia de 2s al cortar**: el corte abrupto desde grabación a "fuiste detenido" es violento. Una pantalla de transición da tiempo psicológico para procesar.

## 11. Migración del Sesión Libre actual

- `LiveModule` literal del frontend cambia: se saca `'consistency'`, se agrega `'facial_expression'`.
- `LIVE_MODULES`, `LIVE_MODULE_LABELS`, `LIVE_MODULE_DESCRIPTIONS` se actualizan.
- `DimensionSelector` muestra los 4 nuevos.
- El componente `SessionSummaryScreen` se mantiene para el caso `summary` (corte por usuario / timeout sin strikes), pero recibe el nuevo set de módulos.
- Las sesiones live antiguas con `consistency` siguen siendo válidas en BD (no se borran datos). Solo el flujo nuevo no permite seleccionar `consistency`.

## 12. Componentes Atomic Design

```
features/live-session/
├── domain/
│   ├── LiveSession.ts             ← actualizo modules
│   ├── StrikeEvent.ts             ← nuevo
│   ├── EmotionTrigger.ts          ← nuevo
│   └── NoiseCalibration.ts        ← nuevo
├── infrastructure/
│   ├── dto/
│   │   └── FrameEvaluationDtos.ts ← request/response del POST evaluate-frame
│   └── repositories/
│       └── HttpLiveSessionRepository.ts ← extiendo con evaluateFrame
├── services/                       ← lógica de browser APIs
│   ├── audioFraming/
│   │   ├── noiseCalibrator.ts
│   │   ├── pauseDetector.ts
│   │   └── frameRecorder.ts
│   └── emotionMonitor/
│       ├── emotionSmoother.ts
│       └── sustainedDetector.ts
└── presentation/
    ├── hooks/
    │   ├── useFrameStrikes.ts
    │   ├── useEmotionStop.ts
    │   └── useLiveSession.ts       ← refactor mayor, orquesta todo
    └── components/
        ├── atoms/
        │   └── CalibrationRing.tsx ← anillo de progreso de los 2s
        ├── molecules/
        │   ├── StrikeMarker.tsx    ← marcador en el reproductor
        │   └── ModuleTabPill.tsx   ← tab pill del feedback page
        ├── organisms/
        │   ├── CalibrationScreen.tsx
        │   ├── StoppedTransitionOverlay.tsx ← los 2s de "tu sesión fue detenida"
        │   ├── FrameAudioPlayer.tsx ← audio con marcadores
        │   └── StrikeFeedbackBody.tsx ← contenido del feedback page
        └── pages/
            └── StrikeFeedbackPage.tsx
```

## 13. Lo que NO incluye (YAGNI por ahora)

- Persistencia de frames individuales en BD (puede agregarse después si se quiere análisis longitudinal).
- Streaming bidireccional websocket (decidido HTTP por simplicidad).
- Replay/re-evaluación de la sesión post-corte (puede agregarse cuando haya UI de gestión de sesiones).
- Ajuste del umbral de 55 / 5s / 3 strikes en tiempo de runtime (constantes en código).
- Notificación al backend de los strikes individuales — solo se notifica el stop_reason al cierre.
- Configurabilidad de las emociones disparadoras (constantes en código).

## 14. Hotfix de grounding en la pantalla de resultados

A partir del hotfix `live-evaluation-grounding`, la respuesta del composed Gemini
trae tres campos nuevos efímeros que la `SessionSummaryScreen` renderiza:

### 14.1 Tarjeta de transcripción

Cuando `evaluation.transcript` viene poblado, la pantalla muestra una tarjeta
arriba de los módulos con el texto transcripto por Gemini. Si la respuesta
incluye `evaluation.muletillas.muletillas_positions[]`, cada ocurrencia se
pinta sobre el transcript usando el átomo compartido
`shared/ui/atoms/HighlightedTranscript`. Esto permite al usuario verificar a
simple vista qué se interpretó como muletilla, igual que en el módulo standalone
de muletillas (que ya consumía el mismo átomo antes del hotfix).

### 14.2 Lista de errores prosódicos (acentuación)

La tarjeta del módulo `accentuation` ahora renderiza `prosodic_errors[]` cuando
viene poblado: una lista de palabras del transcript con la acentuación esperada
y la observada, más una sugerencia accionable. Si la lista llega vacía, no se
renderiza nada extra (el score y el feedback quedan como antes).

### 14.3 Lista de errores fonémicos (pronunciación)

La tarjeta del módulo `pronunciation` ahora renderiza `phoneme_errors[]`: una
lista de palabras con el fonema afectado, el problema y la sugerencia. Misma
lógica de empty-state.

### 14.4 Compatibilidad

Los tres campos son opcionales en los tipos de dominio
(`MuletillaPosition`, `ProsodicError`, `PhonemeError`). Si una respuesta vieja
(pre-hotfix) llega sin estos campos, los componentes nuevos se ocultan
silenciosamente y el resto de la pantalla funciona igual. Esto evita romper el
rollout si llegara a haber un build de frontend en una región sin el backend
actualizado, aunque hoy ambos despliegues van acoplados al mismo commit.

### 14.5 Por qué el átomo de transcript es compartido

Antes del hotfix el `HighlightedTranscript` vivía en
`features/muletillas/presentation/components/atoms/`. El hotfix lo movió a
`shared/ui/atoms/HighlightedTranscript.tsx` con una interfaz neutral
(`startChar`, `endChar`) y dos consumidores: la pantalla de muletillas
standalone y la `SessionSummaryScreen` del módulo live. Cada consumidor mapea
sus posiciones a la forma neutral en su call site (live mapea snake_case →
camelCase ahí mismo).

## 15. Strike system por errores (no-dedup, threshold 2)

### 15.1 Criterio de strike actual

`useFrameStrikes` cuenta **cada item de error reportado** por Gemini en cada
frame, sin deduplicar:

| Categoría | Qué cuenta | Threshold |
|---|---|---|
| Muletillas | Cada ocurrencia detectada (suma de `count`) | 2 ocurrencias |
| Pronunciación | Cada item en `phoneme_errors[]` | 2 items |
| Acentuación | Cada item en `prosodic_errors[]` | 2 items |

La sesión se autocorta cuando **cualquiera** de los tres contadores llega a 2.
Son independientes: 1 muletilla + 1 error de pronunciación no detiene.

### 15.2 Por qué no-dedup

Probamos antes con dedup por palabra normalizada (lowercase + NFKD strip
accents) y un usuario que repetía 6 veces el mismo error solo sumaba 1
strike. Pedagógicamente fallaba: el usuario podía clavarse en el mismo
error muchos segundos sin que el sistema lo frenara. El no-dedup es
predecible (cada item que el modelo reporta cuenta) y le da al usuario un
margen corto (1 error de aviso) antes del corte.

Como Gemini ya agrupa naturalmente errores repetidos del mismo fonema en
una sola entrada `phoneme_errors[]` la mayoría de las veces, en la práctica
el counter no se dispara de forma absurda — refleja con bastante fidelidad
"el usuario tuvo N momentos distintos con errores".

## 16. Diferenciación por módulos seleccionados

`useLiveSession` orquesta el pipeline en función de qué módulos están
activos. Dos flags derivadas se exponen:

- `audioEnabled = selectedModules.some(m => m !== 'facial_expression')`
- `facialEnabled = selectedModules.includes('facial_expression')`

### 16.1 Solo audio (`muletillas` / `accentuation` / `pronunciation`, sin facial)

- Se pide permiso al micrófono.
- Se construye el grafo de audio (analyser).
- Se calibra el noise floor (`CALIBRATION_MS`).
- Se levanta `MediaRecorder` principal + `PauseDetector` + `FrameRecorder`.
- No se carga `LiveFaceLoop` ni `FaceDetectionService` (lazy import nunca).
- No se ejecuta `useEmotionStop.start()`.
- La pantalla `CalibrationScreen` muestra "Calibrando audio — mantente en silencio".

### 16.2 Solo facial (`facial_expression`)

- **NO se pide permiso al micrófono.** `audioStreamRef` queda en `null`.
- No se construye grafo de audio, no se calibra noise floor.
- No hay `MediaRecorder` principal, no hay frames audio enviados a Gemini.
- Se carga `LiveFaceLoop` y se enciende la cámara.
- La calibración corre por **timer Y mínimo `MIN_FACIAL_BASELINE_SAMPLES = 45`
  muestras de blendshape** (con cap `FACIAL_CALIBRATION_CAP_MS = 10s`).
- La pantalla muestra "Calibrando cámara — mirá la cámara con cara neutral".
- Al cierre el endpoint `audio-evaluation` recibe un blob vacío; el backend
  hace short-circuit y no llama a Gemini (ver sección 12.5 del doc backend).
- `emotionStop` corre normal y puede disparar `auto_stop_emotion`.

### 16.3 Audio + facial mezclados

- Se piden ambos permisos (mic + cámara).
- Calibración: espera el `CALIBRATION_MS` del audio Y las 45 muestras
  faciales (lo que tarde más, capeado a 10s). El `progress` mostrado al
  usuario es el mínimo de los dos.
- La pantalla muestra "Calibrando audio y cámara — mantente en silencio y
  mirá la cámara con cara neutral".
- Todos los pipelines corren en paralelo.

### 16.4 Por qué la calibración pide 45 muestras faciales

El módulo standalone `facial_expression` exige exactamente 45 muestras
para construir su baseline (`CALIBRATION_SAMPLES = 45` en
`useEmotionTracking`). Live antes solo respetaba el timer del audio
(~2-3s) y a 15fps eso da ~30-45 muestras, sensible al jitter del modelo
MediaPipe al cargar. Por debajo de 30 muestras la varianza del baseline
es alta y el `SustainedDetector` empieza a clasificar emociones reales
como "neutralidad" (porque la baseline absorbió cara no-neutral) o
viceversa. El parche fue igualar la cantidad mínima a la del standalone.

### 15.3 StrikeEvent extendido

`StrikeEvent` ahora carga campos opcionales accionables:

- `word` (todas las categorías).
- `phoneme` (pronunciación).
- `expectedStress` (acentuación).
- `actualIssue` y `suggestion` (pronunciación y acentuación).

`StrikeFeedbackBody.WordErrorsPanel` (reemplaza al antiguo
`ScoreThresholdPanel`) renderiza cada strike como:

```
palabra · fonema /rr/ o esperado PÁ-ja-ro    (timestamp)
  cómo lo dijiste
  cómo corregirlo
```

en lugar del `"Score parcial mínimo: 50"` genérico anterior.

### 15.4 Compatibilidad de DTOs

Los campos `phoneme_errors[]`, `prosodic_errors[]`, `muletillas_positions[]`
y `transcript` en el frame DTO son opcionales. Si el backend devuelve un
frame sin esos campos (pre-hotfix), el counter queda en 0 para esa categoría
y no se cortan strikes — comportamiento seguro durante el rollout.
