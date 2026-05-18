# Modulo de Sesion Libre — Frontend

> A partir de la branch `feature/live_phonation_loudness` (mayo 2026),
> pronunciacion y acentuacion fueron retiradas de la sesion libre y en su
> lugar entraron fonacion y volumen como modulos client-side. El strike
> system en vivo lo dispara solo muletillas (via AssemblyAI streaming);
> el detalle del pipeline de streaming vive en
> [`live-strike-system.md`](./live-strike-system.md). Este archivo
> describe el modelo de pantalla y el flujo de alto nivel.

## 1. Descripcion funcional

La Sesion Libre permite al usuario hablar de forma espontanea durante hasta cinco minutos
y obtener al final una evaluacion compuesta sobre el mismo audio. El usuario elige los
modulos a evaluar antes de empezar; durante la grabacion la app evalua frames cortos para
alimentar un sistema de strikes y, si los modulos de senal (expresion facial, fonacion,
volumen) estan activos, monitorea umbrales sostenidos. Si completa la sesion sin disparar
el corte automatico, al cierre el backend hace una unica llamada Gemini compuesta sobre
muletillas y la pantalla de resumen muestra el desglose por modulo y el puntaje agregado.
Si se dispara el corte automatico, ve la pantalla de feedback rica con detalle por modulo,
audio reproducible y marcadores en cada evento.

Los cuatro modulos disponibles en Sesion Libre son: **muletillas, fonacion, volumen
(loudness) y expresion facial**. Los demas modulos del producto (pronunciacion,
acentuacion, pausas, consistencia, precision, versatilidad linguistica, fluidez) siguen
disponibles solo como modulos independientes en sus propias paginas. Muletillas se evalua
con una llamada Gemini al cierre y dispara strikes en vivo via AssemblyAI; fonacion y
volumen se computan client-side desde el `AudioWorklet` de pitch + dB y se envian como
`phonation_summary` / `loudness_summary` junto al audio; expresion facial corre con su
clasificador local de emociones.

## 2. Navegacion

Pagina disponible en `/sesion-libre`. Aparece en la barra de navegacion lateral bajo el
nombre "Sesion Libre" con el icono de microfono (`live`).

## 3. Jerarquia de componentes

```
LiveSessionPage
  ├── DimensionSelector            (fase 'selection')
  │     └── selector de preset de volumen (si loudness esta tildado)
  ├── CalibrationScreen            (fase 'calibrating')
  ├── LiveRecordingScreen          (fases 'recording' y 'evaluating')
  │     ├── LivePhonationMeter     (si fonacion esta tildada)
  │     └── LiveLoudnessMeter      (si volumen esta tildado)
  ├── StoppedTransitionOverlay     (fase 'stopped_transition')
  ├── StrikeFeedbackBody           (fase 'stopped_feedback' con auto_stop_*)
  └── SessionSummaryScreen         (fase 'summary')
```

`LiveSessionPage` no tiene estado propio: lee la fase desde `useLiveSession` y elige cual
organismo renderizar. Los organismos viven en `presentation/components/organisms/`. La
pantalla de error es una rama in-line del Page, no un organismo separado, porque consiste
solo en un titulo y dos botones.

## 4. Hook principal: useLiveSession

### Maquina de estados (fases)

```typescript
type LiveSessionPhase =
  | 'selection'
  | 'calibrating'
  | 'recording'
  | 'evaluating'
  | 'stopped_transition'
  | 'stopped_feedback'
  | 'summary'
  | 'error'
```

- **selection**: estado inicial. El usuario marca/desmarca modulos. `DimensionSelector` se
  muestra. `Comenzar` queda deshabilitado mientras la lista este vacia.
- **calibrating**: tras `start()`, una ventana corta para medir el piso de ruido del
  microfono y, si volumen esta tildado, una segunda etapa para capturar la voz del usuario
  como base de las bandas (mic_noise → voice_baseline → finalizing). La copia adapta segun
  el modulo activo.
- **recording**: tras la calibracion, se abrio la sesion live (`POST /live/sessions`) y
  comenzo la captura con `useAudioRecorder`. Un `setInterval` de un segundo incrementa
  `elapsedSeconds`; al alcanzar `MAX_SESSION_SECONDS = 300` se dispara `stop()`
  automaticamente.
- **evaluating**: tras `stop()` (manual o auto), se detuvo la captura y se subio el blob a
  `POST /live/sessions/:id/audio-evaluation`. Mientras la respuesta no llega, la UI muestra
  un spinner.
- **stopped_transition**: overlay breve "¡CORTEN!" cuando un auto-stop dispara (muletillas,
  emocion sostenida, volumen saturado o saltos de fonacion). Cubre el switch entre
  recording y la pantalla rica de feedback.
- **stopped_feedback**: pantalla rica que se muestra tras un auto-stop con tabs por modulo
  (resumen, muletillas, fonacion, volumen, expresion facial) y el audio reproducible.
- **summary**: cuando la sesion termina por tiempo o por boton manual sin auto-stop, con la
  respuesta del endpoint y el `finalize` posterior, se renderiza `SessionSummaryScreen` con
  `evaluation` y `liveScore`.
- **error**: cualquier fallo (microfono denegado, Gemini sin respuesta, red caida, etc.)
  termina aca con un mensaje. El usuario puede reintentar (`reset()` vuelve a selection) o
  ir al dashboard.

### Transiciones

```
selection → calibrating              (start() exitoso)
calibrating → recording              (calibracion lista)
recording → evaluating               (stop() manual o por time limit)
recording → stopped_transition       (auto_stop_muletillas/emotion/loudness/phonation)
stopped_transition → evaluating      (overlay termina)
evaluating → summary                 (sin auto-stop: audio-evaluation + finalize OK)
evaluating → stopped_feedback        (con auto-stop: composed-eval + finalize OK)
evaluating → error                   (audio-evaluation o finalize fallaron)
recording → error                    (stopRecording fallo)
selection → error                    (no hay modulos seleccionados o startSession fallo)
summary → selection                  (reset())
stopped_feedback → selection         (reset())
error → selection                    (reset())
```

### Refs

- `sessionIdRef`: id devuelto por el backend en `POST /live/sessions`. Vive fuera del
  estado React porque `stop()` lo necesita sin causar re-renders cuando lo escribe.
- `startedAtRef`: timestamp del backend al abrir la sesion. Se manda como `started_at` en
  el form de audio-evaluation. El backend lo reusa como `started_at` de cada hijo creado.
- `timerRef`: handle del `setInterval` de elapsedSeconds. Se limpia en `stop()`, `reset()`
  y al desmontar.
- `isStoppingRef`: guard contra doble-entrada en `stop()` (puede dispararse simultaneamente
  por click manual y por time limit).

### Limpieza al desmontar

El `useEffect` de cleanup hace tres cosas:

1. `clearTimer()`: cancela el contador.
2. `recorder.releaseResources()`: detiene microfono y libera el `MediaStream`.
3. Si la fase era `recording` o `evaluating`, llama `abandonSession` con
   `stop_reason='user_stop'` en best-effort. La llamada es fire-and-forget porque la
   fase de cleanup es sincrona y `fetch` no se puede await dentro. En la practica el
   navegador suele completar la llamada; si el usuario cierra la pestana abruptamente,
   la fila live puede quedar `active` en BD. Limitacion conocida, no bug.

## 5. Captura de audio: useAudioRecorder compartido

El hook `useAudioRecorder` vive en `frontend/src/shared/hooks/`. Es el mismo que usan
muletillas y los modulos individuales que graban audio.

Detecta el MIME type soportado en orden: `audio/webm;codecs=opus`, `audio/webm`,
`audio/mp4`. Esto resuelve la diferencia entre Chrome/Android (webm/opus) y iOS Safari
(mp4). El blob resultante se envia tal cual al backend; el endpoint
`audio-evaluation` lee `content_type` y lo pasa a Gemini sin transcoding.

A diferencia del live viejo (que usaba Web Audio API + ScriptProcessorNode + PCM
streaming), aqui usamos `MediaRecorder` porque:

- No hay streaming: solo necesitamos un blob al final, y `MediaRecorder` lo entrega
  cerrado y listo para mandar.
- El backend ya no espera PCM crudo — Gemini acepta tanto webm como mp4 nativamente.
- Es codigo menos exotico y se comparte con los modulos individuales.

## 6. Repositorio HTTP

`HttpLiveSessionRepository` encapsula los cinco endpoints del lifecycle live mas el de
audio-evaluation. Todos pasan por `apiRequest` desde `src/api/client.ts`, incluido el
multipart: `apiRequest` detecta `body instanceof FormData` y deja que el navegador
ponga el `Content-Type` con el boundary correcto (eso es lo unico nuevo del cliente).

Metodos principales (ver `infrastructure/repositories/HttpLiveSessionRepository.ts`):

| Metodo | Endpoint | Uso desde el hook |
|--------|----------|-------------------|
| `startSession()` | `POST /live/sessions` | al comenzar la sesion. |
| `evaluateAudio(id, req)` | `POST /live/sessions/:id/audio-evaluation` | al cerrar la grabacion. |
| `finalizeSession(id)` | `POST /live/sessions/:id/finalize` | tras audio-evaluation, agrega score. |
| `abandonSession(id, reason)` | `PATCH /live/sessions/:id/abandon` | en cleanup, error o microfono denegado. |
| `listSessions()` | `GET /live/sessions` | (no se usa todavia desde la pagina; queda disponible para historial). |
| `getSession(id)` | `GET /live/sessions/:id` | (idem). |

## 7. Comportamiento responsive

- `DimensionSelector` y `LiveRecordingScreen` usan `max-w-md mx-auto` para que el ancho se
  contenga en pantallas grandes y se adapte fluido en mobile.
- `SessionSummaryScreen` usa `max-w-2xl` y rejillas `grid-cols-2 sm:grid-cols-4` para los
  sub-scores: en mobile se apilan en dos columnas, en tablet/desktop en cuatro.
- Botones primarios usan touch targets `min-h-[44px]` segun la regla del CLAUDE.md
  multiplataforma.
- La altura de pantalla completa usa `100dvh`, no `100vh`, porque la barra de Safari en
  iOS rompe `100vh`.

## 8. Decisiones de diseno

### No hay feedback en tiempo real

El backend nuevo hace una unica llamada a Gemini al cierre de la grabacion. La UI lo
explicita con el texto "La retroalimentacion detallada aparecera cuando termines la
sesion" en `LiveRecordingScreen`. Mostrar un panel vacio o falso analisis en vivo seria
peor experiencia que ser explicito.

### Cuatro modulos, no ocho

Los demas modulos del producto requieren modos de input incompatibles con el habla libre
(precision/versatilidad piden rondas de Q&A, fluidez y consistencia comparten el WS PCM
historico, pausas requiere un escenario monitoreado y pronunciacion/acentuacion necesitan
prompts especificos por frase). Para no degradar la calidad de evaluacion, la sesion libre
solo cubre los cuatro modulos cuya evaluacion sirve sobre habla libre con un solo audio
y un solo prompt compuesto (muletillas) o calculos en cliente sobre la senal de audio
(fonacion, volumen) y de video (expresion facial).

### Auto-stops disponibles

Cuatro categorias de corten en vivo, todas optativas segun los modulos tildados.
Las dos de senal de audio tienen sub-razon que diferencia el copy mostrado al
usuario en el overlay y en la pantalla de feedback:

- `muletillas`: AssemblyAI emite un strike y el hook dispara `triggerStop('auto_stop_strikes')`
  al primero.
- `emotion`: el clasificador local detecta una emocion sostenida (3 s) y dispara
  `triggerStop('auto_stop_emotion')`.
- `loudness` (`auto_stop_loudness`): el detector cuenta el tiempo continuo
  fuera de la banda `optimal`. A los **1.5 s sostenidos en `too-high` o
  `clipping`** dispara el corten. Sub-razones:
  - `clipping`: el usuario satura el microfono (db por encima del clip
    threshold del preset). Copy: "saturaste el microfono".
  - `too_high`: el usuario habla demasiado alto pero sin saturar el ADC.
    Copy: "hablaste demasiado alto".
  La banda `too-low` no dispara corten (sin clipping y silencio van por
  conteo al composed-eval).
- `phonation` (`auto_stop_phonation`): dos detectores en paralelo:
  - `high_pitch`: la frecuencia fundamental sobrepasa `baselineHz * 1.25`
    de forma continua por **1.5 s**. El baseline es el promedio de Hz que
    el usuario produjo durante el step `voice_baseline` de la calibracion
    (3 s hablando "normal"). Copy: "tu voz se mantuvo aguda".
  - `breaks`: 5 saltos > 50 Hz dentro de una ventana de 10 s. Copy:
    "saltos de frecuencia repetidos".
  Cuando ambos se gatillan al mismo tiempo, el reporte va con la sub-razon
  del detector que tripeo primero (en la practica `high_pitch` se nota
  antes que el contador de saltos).

Los cuatro alimentan la fase `stopped_transition` con su categoria + sub-razon
opcional, y luego `stopped_feedback` con la mezcla de tabs correspondientes y
el headline especifico segun la causa.

### Selector de preset de volumen

El selector de preset es parte de `DimensionSelector`: aparece como dropdown solo cuando el
usuario tilda volumen. Lee la lista de presets desde `GET /loudness/presets` y prefiere el
que tenga `is_default=true`; si no hay default elige el primero de la lista. El `preset_id`
elegido viaja en el `loudness_summary` al cierre para que el backend pueda almacenar la
referencia exacta.

### Pitch + dB en cliente (AudioWorklet)

Tanto fonacion como volumen consumen frames de un mismo `AudioWorkletNode`
(`/worklets/phonation.worklet.js`) que emite `{ hz, db }` cada ~50 ms. Esto evita abrir el
microfono dos veces y mantiene la latencia baja en iOS Safari, donde
`getUserMedia` paga su coste solo una vez. Los hooks `useLivePhonation` y `useLiveLoudness`
escuchan ese stream y mantienen sus propios contadores y resumenes.

### Baseline de Hz y dB para la calibracion personal

El hook `useVoiceBaseline` corre durante el step `voice_baseline` de la
calibracion (3 s) acumulando los Hz **y los dB** de cada frame voiced. Al
cerrar el step expone el promedio de ambos como `baselineHz` y
`baselineDb`. Estos valores se usan para personalizar dos cosas:

- `useLivePhonation` recibe `baselineHz` y arma su techo de "voz aguda"
  como `baselineHz * 1.25`. Si el baseline es null (silencio durante los
  3 s), el detector de `high_pitch` queda desactivado y solo el de
  `breaks` sigue activo.
- El `loudnessConfig` ancla las bandas del preset elegido sobre
  `baselineDb` real (`tooLow = baselineDb + low_offset_db`,
  `optimal = baselineDb + optimal_offset_db`). Antes la referencia era
  `noiseFloor + 25 dB` asumido, lo cual descalibraba al usuario que
  hablaba mas alto o mas bajo que esos 25 dB de "voz tipica" estimada.
  Si la medicion falla, hay fallback a `noiseFloor + 25 dB`.

La ventana de baseline se activa cuando loudness *o* fonacion estan
tildados.

### Logs de diagnostico en sesion live

`useLiveSession` emite tres `console.info` para poder dimensionar el
comportamiento del corten desde devtools sin instrumentar mas:

- `[live-session] voice baseline captured` con `{ hz, db, samples }`
  al cerrar el step voice_baseline.
- `[live-session] loudness config resolved` con el preset, si la
  baseline fue medida o fallback, y los thresholds resultantes en dBFS.
- `[live-session] loudness auto-stop` / `[live-session] phonation
  auto-stop` con la sub-razon, la banda/Hz actual, el streak y el
  contador de saltos en el momento de disparar el corten.

Esto deja todos los numeros relevantes en el console del navegador
para iterar las constantes (`OUT_OF_RANGE_THRESHOLD_MS`,
`HIGH_PITCH_FACTOR`, `HIGH_PITCH_THRESHOLD_MS`) basados en sesiones
reales en lugar de defaults teoricos.

### El score agregado lo da `finalize`

`finalize_live_session` en backend promedia los hijos completos. El frontend no recalcula
el promedio por su cuenta para evitar discrepancias con la BD si las formulas cambian. El
unico calculo client-side es para los `mainScore` de los cards (acentuacion y pronunciacion
hacen `round(avg(sub_scores))` para igualar lo que el backend persistio).

### Page sin estado, hook con todo

El page solo selecciona organismo segun fase. Asi se puede testear la maquina de estados
del hook sin montar el arbol completo, y se puede agregar tracking/analytics envolviendo
las callbacks del hook en un punto unico.

## 9. Pendientes en el roadmap

- **Historial de sesiones live**: hoy `listSessions` y `getSession` estan en el repo pero
  ninguna pantalla los consume. La pantalla de historial es trabajo separado.
- **Auto-stop por bajo desempeno**: feature mencionada en la conversacion original. No
  esta en el MVP — Gemini no devuelve scores en streaming, asi que cualquier auto-stop
  por desempeno tendria que reformularse (por ejemplo, abortar tras N segundos de
  silencio detectado client-side).
- **Resume de live abandonada**: si el usuario cierra la pestana en medio de una sesion,
  la fila queda `active` en BD. Una pantalla de "tenes una sesion sin terminar" cubriria
  ese caso, pero requiere endpoint nuevo (`GET /live/sessions/active`) y un flujo de
  resume del lado cliente. No esta en el MVP.
