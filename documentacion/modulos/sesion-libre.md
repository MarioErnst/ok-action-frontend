# Modulo de Sesion Libre — Frontend

> El strike system corre sobre WebSocket directo a Gemini Live con function
> tools (umbral 1 strike por categoría). El detalle del pipeline de streaming
> vive en [`live-strike-system.md`](./live-strike-system.md). Este archivo
> describe el modelo de pantalla y el flujo de alto nivel; los servicios de
> audio streaming, WS y persistencia están documentados allí.

## 1. Descripcion funcional

La Sesion Libre permite al usuario hablar de forma espontanea durante hasta cinco minutos
y obtener al final una evaluacion compuesta sobre el mismo audio. El usuario elige los
modulos a evaluar antes de empezar; durante la grabacion la app evalua frames cortos para
alimentar un sistema de strikes y, si la expresion facial esta activa, monitorea emociones
sostenidas. Si completa la sesion sin disparar el corte automatico, al cierre el backend
hace una unica llamada Gemini compuesta y la pantalla de resumen muestra el desglose por
modulo y el puntaje agregado. Si se dispara el corte automatico, ve la pantalla de
feedback rica con detalle por modulo, audio reproducible y marcadores en cada evento.

Los cuatro modulos disponibles en Sesion Libre son: muletillas, acentuacion, pronunciacion
y expresion facial. Los demas modulos del producto (fonacion, volumen, pausas, consistencia,
precision, versatilidad linguistica, fluidez) siguen disponibles solo como modulos
independientes en sus propias paginas.

## 2. Navegacion

Pagina disponible en `/sesion-libre`. Aparece en la barra de navegacion lateral bajo el
nombre "Sesion Libre" con el icono de microfono (`live`).

## 3. Jerarquia de componentes

```
LiveSessionPage
  ├── DimensionSelector       (fase 'selection')
  ├── LiveRecordingScreen     (fases 'recording' y 'evaluating')
  └── SessionSummaryScreen    (fase 'summary')
```

`LiveSessionPage` no tiene estado propio: lee la fase desde `useLiveSession` y elige cual
organismo renderizar. Los tres organismos viven en
`presentation/components/organisms/`. La pantalla de error es una rama in-line del Page,
no un organismo separado, porque consiste solo en un titulo y dos botones.

## 4. Hook principal: useLiveSession

### Maquina de estados (fases)

```typescript
type LiveSessionPhase = 'selection' | 'recording' | 'evaluating' | 'summary' | 'error'
```

- **selection**: estado inicial. El usuario marca/desmarca modulos. `DimensionSelector` se
  muestra. `Comenzar` queda deshabilitado mientras la lista este vacia.
- **recording**: tras `start()`, se abrio la sesion live (`POST /live/sessions`) y comenzo
  la captura con `useAudioRecorder`. Un `setInterval` de un segundo incrementa
  `elapsedSeconds`; al alcanzar `MAX_SESSION_SECONDS = 300` se dispara `stop()`
  automaticamente.
- **evaluating**: tras `stop()` (manual o auto), se detuvo la captura y se subio el blob
  a `POST /live/sessions/:id/audio-evaluation`. Mientras la respuesta no llega, la UI
  muestra un spinner.
- **summary**: con la respuesta del endpoint y el `finalize` posterior, se renderiza
  `SessionSummaryScreen` con `evaluation` y `liveScore`.
- **error**: cualquier fallo (microfono denegado, Gemini sin respuesta, red caida, etc.)
  termina aca con un mensaje. El usuario puede reintentar (`reset()` vuelve a
  selection) o ir al dashboard.

### Transiciones

```
selection → recording        (start() exitoso)
recording → evaluating       (stop() manual o por time limit)
evaluating → summary         (audio-evaluation + finalize OK)
evaluating → error           (audio-evaluation o finalize fallaron)
recording → error            (stopRecording fallo)
selection → error            (no hay modulos seleccionados o startSession fallo)
summary → selection          (reset())
error → selection            (reset())
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
historico, y fonacion/volumen/pausas/expresion-facial corren con calculos del cliente
sobre seniales DSP o video). Para no degradar la calidad de evaluacion, la sesion libre
solo cubre los cuatro modulos cuya evaluacion sirve sobre habla libre con un solo audio
y un solo prompt compuesto.

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
