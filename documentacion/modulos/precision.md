# Modulo de Precision — Frontend

## 1. Descripcion general

El modulo de Precision entrena al usuario en la comunicacion oral precisa: directa, relevante y concisa.
El usuario responde en voz alta una serie de preguntas abiertas; cada respuesta se graba, se envia al
backend y se evalua con tres metricas: relevancia, directness y concision. Al completar todas las
rondas, el backend calcula un puntaje global y el frontend presenta un resumen por ronda.

Desde la perspectiva del usuario:
1. El usuario abre la pagina y ve una breve descripcion del modulo.
2. Presiona "Comenzar sesion"; el sistema carga las preguntas.
3. Para cada pregunta: lee el texto, presiona "Grabar respuesta", responde en voz alta, presiona "Terminar respuesta".
4. El sistema evalua el audio y muestra el resultado de la ronda (o un aviso si el audio fue ininteligible).
5. El usuario avanza a la siguiente pregunta o re-graba si el audio fallo.
6. Al responder la ultima pregunta, el sistema finaliza la sesion y muestra el resumen total.
7. El usuario puede iniciar una nueva sesion desde el resumen.

## 2. Flujo de pantallas

El hook `usePrecisionSession` implementa una maquina de estados explicita con la siguiente secuencia:

```
IDLE
  └─ startSession() ──────────────────────────→ LOADING_SESSION
                                                      │
                                    exito             │  error
                              ┌───────────────────────┴─────────────────┐
                              ↓                                           ↓
                           ASKING                                       ERROR
                              │
               startRecordingAnswer()
                              │
                              ↓
                          RECORDING
                              │
               stopAndEvaluate() → EVALUATING
                              │
                  audioIntelligible?
              ┌───────────────┴───────────────┐
              ↓ true                           ↓ false
         ROUND_RESULT                    UNINTELLIGIBLE
              │                               │
              │ nextQuestion()                │ onNext() / onRetry()
              │                               │
              └───────────────────────────────┘
                              │
                   ¿ultima pregunta?
              ┌───────────────┴───────────────┐
              ↓ no                             ↓ si
           ASKING                          EVALUATING (finalizacion)
                                               │
                                           COMPLETED / ERROR
```

Estado `ABANDONED`: se emite en cleanup al desmontar el componente si la sesion esta activa.
No hay pantalla asociada; es un estado interno que dispara `abandonPrecisionSession` en el backend.

### Descripcion de cada fase

- **IDLE**: estado inicial. Muestra la pantalla de inicio con el boton "Comenzar sesion".
- **LOADING_SESSION**: spinner mientras se crea la sesion y se cargan las preguntas en el backend.
- **ASKING**: el usuario lee la pregunta y decide cuando empezar a grabar.
- **RECORDING**: `MediaRecorder` activo; el timer cuenta segundos transcurridos.
- **EVALUATING**: audio enviado al backend; spinner de espera. Se reutiliza para la finalizacion de sesion.
- **ROUND_RESULT**: resultado de la ronda actual (puntajes + feedback). El audio fue inteligible.
- **UNINTELLIGIBLE**: el backend no pudo evaluar el audio. Ofrece re-grabar o continuar.
- **COMPLETED**: sesion finalizada. Se muestra `SessionSummaryScreen` con puntaje global y grilla por ronda.
- **ERROR**: error de red o del backend. Muestra mensaje y boton de reintento. `prevPhaseRef` determina
  a que fase volver al reintentar.
- **ABANDONED**: solo de cleanup; no tiene representacion visual.

## 3. Estructura de archivos por capa

```
src/features/precision/
  domain/
    PrecisionQuestion.ts        tipo que representa una pregunta: id, text, category, difficultyLevel
    PrecisionRound.ts           tipo que representa el resultado de una ronda evaluada
    PrecisionScores.ts          tipo PrecisionScores (relevance, directness, conciseness, overall)
                                y funciones utilitarias scoreColor / scoreBgColor
    PrecisionSession.ts         tipo que representa la sesion completa (id, status, rounds, etc.)

  infrastructure/
    PrecisionSessionDTO.ts      interfaces DTO en snake_case que reflejan la API REST del backend
    PrecisionSessionMapper.ts   convierte PrecisionSessionDTO / PrecisionRoundDTO a tipos de dominio
    PrecisionRepository.ts      todas las llamadas HTTP del modulo (fetch + FormData + autenticacion)

  use_cases/
    startPrecisionSession.ts    crea sesion en el backend y mapea las preguntas a dominio
    submitPrecisionAnswer.ts    envia el audio de una ronda y convierte EvaluateRoundDTO a PrecisionRound
    finalizePrecisionSession.ts cierra la sesion y retorna el puntaje global
    abandonPrecisionSession.ts  marca la sesion como abandonada; se llama en el cleanup del hook
    getPrecisionSession.ts      consulta el estado de una sesion existente (GET by id)

  presentation/
    hooks/
      usePrecisionSession.ts    hook principal de orquestacion; maquina de estados, grabacion, timer
    pages/
      PrecisionPage.tsx         renderiza la fase activa delegando a los organismos correspondientes
    components/
      atoms/
        PrecisionScoreBadge.tsx muestra un puntaje numerico con etiqueta, coloreado segun umbral
        PrecisionTimer.tsx      muestra el tiempo transcurrido durante la grabacion (mm:ss o Xs)
      molecules/
        QuestionCard.tsx        tarjeta con el texto de la pregunta, numero de ronda y categoria
        PrecisionScoreRow.tsx   fila con label, puntaje numerico y barra de progreso coloreada
      organisms/
        RecordAnswerScreen.tsx  pantalla completa de grabacion (fases ASKING y RECORDING)
        RoundResultScreen.tsx   pantalla de resultado por ronda (fases ROUND_RESULT y UNINTELLIGIBLE)
        SessionSummaryScreen.tsx pantalla de resumen al completar la sesion (fase COMPLETED)
```

## 4. Hook usePrecisionSession

El hook exporta el estado completo de la sesion y los callbacks necesarios para que `PrecisionPage`
no contenga logica de negocio.

### Estado que maneja

```typescript
interface PrecisionSessionState {
  phase: Phase                       // fase actual de la maquina de estados
  sessionId: string | null           // id de la sesion activa en el backend
  questions: PrecisionQuestion[]     // preguntas cargadas al inicio
  currentQuestionIndex: number       // indice de la pregunta en curso
  rounds: PrecisionRound[]           // resultados acumulados de rondas completadas
  overallScore: number | null        // puntaje global devuelto al finalizar
  errorMessage: string | null        // mensaje de error para mostrar al usuario
  noiseLevel: 'low' | 'medium' | 'high'  // nivel de ruido ambiental reportado por el usuario
  elapsedSeconds: number             // segundos transcurridos durante la grabacion activa
}
```

### Callbacks que expone

| Callback | Descripcion |
|---|---|
| `startSession(totalRounds?)` | Crea sesion en backend. Transicion IDLE → LOADING_SESSION → ASKING. |
| `startRecordingAnswer()` | Abre `MediaRecorder`. Transicion ASKING → RECORDING. |
| `stopAndEvaluate()` | Detiene grabacion, envia audio. Transicion RECORDING → EVALUATING → ROUND_RESULT/UNINTELLIGIBLE. |
| `nextQuestion()` | Si hay mas preguntas: ASKING. Si era la ultima: llama `finalizePrecisionSession` → COMPLETED. |
| `retryRecording()` | Re-abre `MediaRecorder` desde UNINTELLIGIBLE. Vuelve a RECORDING. |
| `retry()` | Desde ERROR: vuelve a IDLE o ASKING segun `prevPhaseRef`. |
| `setNoiseLevel(level)` | Actualiza `noiseLevel` sin cambiar la fase. |
| `reset()` | Libera recursos de audio y vuelve al estado inicial IDLE. |

Tambien expone campos derivados del estado:

- `currentQuestion`: la pregunta en curso (`questions[currentQuestionIndex]` o `null`).
- `isLastRound`: `true` cuando `currentQuestionIndex === questions.length - 1`.
- `isRecording`: booleano del hook `useAudioRecorder`, indica si `MediaRecorder` esta activo.

### Manejo de errores

- Si `startPrecisionSession` falla, se pasa a ERROR y `prevPhaseRef` queda en `LOADING_SESSION`
  para que `retry()` vuelva a IDLE.
- Si `submitPrecisionAnswer` falla, se pasa a ERROR con `prevPhaseRef` en `EVALUATING`
  para que `retry()` vuelva a ASKING.
- Si `finalizePrecisionSession` falla, `prevPhaseRef` queda en `ROUND_RESULT`
  para que `retry()` vuelva a ASKING y el usuario pueda intentar finalizar de nuevo.
- Los errores no se suprimen; se almacenan en `errorMessage` y se logran a traves del mensaje de excepcion.

### Cleanup en unmount

El segundo `useEffect` (con array de dependencias vacio) registra una funcion de cleanup que se ejecuta
al desmontar el componente. Si la sesion esta en una fase activa
(`ASKING`, `RECORDING`, `EVALUATING`, `ROUND_RESULT`, `UNINTELLIGIBLE`), llama a
`abandonPrecisionSession` e invoca `releaseResources()` para liberar el `MediaRecorder`.

Esta funcion de cleanup lee de `sessionStateRef` en lugar de leer `state` directamente,
porque el closure capturado al montar el componente tendria valores obsoletos de `sessionId` y `phase`.
`sessionStateRef` se actualiza en cada render mediante el primer `useEffect` (sin array de dependencias),
garantizando que el cleanup siempre vea los valores mas recientes.

## 5. Componentes Atomic Design

### Atoms

**PrecisionScoreBadge**

Muestra un puntaje numerico grande y una etiqueta descriptiva debajo. Aplica el color del texto
segun el umbral definido en `PrecisionScores.scoreColor`: verde si >= 70, amarillo si >= 40, rojo si menor.
Usado en pantallas donde se necesita destacar un valor individual.

Props: `score: number`, `label: string`.

**PrecisionTimer**

Muestra el tiempo transcurrido durante la grabacion. Si hay minutos, el formato es `m:ss`;
si no, muestra `Xs`. Usa la clase `tabular-nums` para evitar saltos de layout al cambiar digitos.

Props: `seconds: number`.

### Molecules

**QuestionCard**

Tarjeta visual que presenta el texto de la pregunta, el numero de ronda en curso, el total de rondas
y la categoria de la pregunta. Sirve como punto de atencion principal durante las fases ASKING y RECORDING.

Props: `questionNumber`, `totalQuestions`, `text`, `category`.

**PrecisionScoreRow**

Fila compuesta por: etiqueta a la izquierda, puntaje numerico a la derecha (coloreado por umbral)
y una barra de progreso que ocupa el ancho completo. El ancho de la barra es `score%` del contenedor;
el color de la barra usa `scoreBgColor`. Se usa en `RoundResultScreen` para mostrar las tres metricas.

Props: `label: string`, `score: number`.

### Organisms

**RecordAnswerScreen**

Pantalla activa durante las fases ASKING y RECORDING. Muestra:
- Indicador de progreso (puntos por ronda completada / actual / pendiente).
- Indicador de nivel de ruido ambiental con colores (bajo / medio / alto).
- `QuestionCard` con el texto de la pregunta.
- Boton "Grabar respuesta" en fase ASKING, o indicador de grabacion activa + `PrecisionTimer` + boton
  "Terminar respuesta" en fase RECORDING.

El estado de grabacion se comunica al componente via la prop `isRecording`; el organismo no contiene
logica de estado propio.

**RoundResultScreen**

Pantalla activa en fases ROUND_RESULT y UNINTELLIGIBLE. Tiene dos modos de renderizado:

- Si `round.audioIntelligible === false`: muestra aviso de audio ininteligible con opcion de re-grabar
  o continuar. (Este modo coincide con la fase UNINTELLIGIBLE.)
- Si `round.scores !== null`: muestra el puntaje global de la ronda, tres `PrecisionScoreRow` con
  las metricas individuales, el feedback textual del backend y el boton de avance.

El boton de avance muestra "Ver resumen" en la ultima ronda o "Siguiente pregunta" en las demas,
controlado por la prop `isLastRound`.

**SessionSummaryScreen**

Pantalla activa en fase COMPLETED. Muestra el puntaje global de la sesion (calculado por el backend
al finalizar) y una grilla con el puntaje de cada ronda. Las rondas ininteligibles muestran un guion.
Ofrece boton "Nueva sesion" que llama a `reset()`.

## 6. Integracion con el backend

### Endpoints consumidos

| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/precision/sessions?total_rounds={n}` | Crea sesion y devuelve preguntas |
| POST | `/api/precision/sessions/{id}/rounds` | Envia audio de una ronda y devuelve evaluacion |
| POST | `/api/precision/sessions/{id}/finalize` | Cierra la sesion y devuelve puntaje global |
| PATCH | `/api/precision/sessions/{id}/abandon` | Marca la sesion como abandonada |
| GET | `/api/precision/sessions/{id}` | Consulta estado de una sesion existente |

### Autenticacion

Todas las peticiones incluyen el header `Authorization: Bearer <token>` cuando existe un token
en `localStorage` bajo la clave `auth_token`. La funcion `authHeaders()` en `PrecisionRepository`
construye este header.

En caso de respuesta 401, el repositorio elimina `auth_user` y `auth_token` de `localStorage`
y redirige a `/login`, reproduciendo el comportamiento del cliente HTTP central `api/client.ts`.

### Manejo de audio

El audio se envia al endpoint de rondas como `multipart/form-data`. El objeto `FormData` incluye:

- `audio`: el `Blob` devuelto por `useAudioRecorder.stopRecording()`, con nombre de archivo
  `response.webm`.
- `question_id`: id de la pregunta en curso.
- `noise_level`: nivel de ruido seleccionado por el usuario.
- `audio_duration_secs`: duracion en segundos (opcional); se omite si es `undefined`.

No se establece el header `Content-Type` manualmente; el navegador lo genera automaticamente
con el boundary correcto al pasar un `FormData` como `body` de `fetch`.

### Resolucion de la URL base

`PrecisionRepository` resuelve `API_BASE_URL` en el siguiente orden de prioridad:
1. `globalThis.__APP_API_URL__` (inyeccion en tiempo de ejecucion, util en contenedores).
2. `import.meta.env.VITE_API_URL` (variable de entorno en tiempo de build).
3. `/api` (fallback para desarrollo local con proxy de Vite).

Este orden es consistente con todos los demas repositorios HTTP del proyecto.

## 7. Decisiones de diseno

### Maquina de estados en lugar de multiples booleans

La logica del modulo requiere distinguir al menos nueve estados distintos. Representar esto con
booleans independientes (por ejemplo `isLoading`, `isRecording`, `isEvaluating`) genera combinaciones
invalidas que el compilador no puede detectar y obliga al programador a mantener la coherencia
manualmente. Una union de strings discriminada (`type Phase = 'IDLE' | 'LOADING_SESSION' | ...`)
hace que cada fase sea exclusiva por construccion y permite que el compilador avise si se omite un
caso en un switch o en los bloques condicionales de `PrecisionPage`.

### questionText vacio en el dominio despues del submit

`EvaluateRoundDTO` no incluye el texto de la pregunta en su respuesta; el backend solo devuelve
los puntajes y el feedback. Por eso `submitPrecisionAnswer` asigna `questionText: ''` al crear el
`PrecisionRound` que retorna. El texto de la pregunta ya esta disponible en el array `questions`
del estado del hook y se accede directamente desde ahi cuando se necesita mostrarlo en pantalla.
Rellenar el campo con un valor de la respuesta del servidor no es posible sin un endpoint adicional
o sin cambiar el contrato de la API.

### elapsedRef en lugar de state.elapsedSeconds en stopAndEvaluate

`stopAndEvaluate` es un `useCallback` que captura `state` en el momento en que se registra el callback.
Como `elapsedSeconds` se incrementa cada segundo mediante `setState`, el valor que veria `stopAndEvaluate`
a traves de `state.elapsedSeconds` seria el del render en que se creo el callback, no el del momento
en que el usuario presiona "Terminar" (stale closure). `elapsedRef.current` se actualiza sincrono
dentro del `setState` del timer, por lo que siempre refleja el valor mas reciente sin generar
dependencias en el array de `useCallback` que forzarian recrear la funcion en cada segundo.

### Diseno responsive con pb-28 en movil y max-w-lg

Los organismos usan `pb-28 lg:pb-6` para agregar padding inferior en movil. Esto previene que el
contenido quede tapado por la barra de navegacion inferior nativa del navegador o por elementos de
navegacion fijos propios de la aplicacion. En pantallas grandes (`lg:`) el padding se reduce porque
la barra de navegacion se desplaza a un rail lateral. El ancho maximo `max-w-lg` centra el contenido
en pantallas amplias sin estirar el formulario de grabacion hasta el ancho completo, lo que
mejoraria la legibilidad del texto de la pregunta y la accesibilidad de los controles en escritorio.

## 8. Integracion con Sesion Libre (Live Session)

Cuando el usuario selecciona la dimension `"precision"` en la pantalla `DimensionSelector` de la
sesion libre, el frontend activa el modo Q&A dentro del WebSocket existente.

### Cambios en el dominio LiveSession.ts

Se agrego `'precision'` al tipo `LiveDim` y se incorporaron nuevas fases al tipo `LiveSessionPhase`:

- `qa_question`: pregunta activa, el usuario esta grabando su respuesta.
- `qa_evaluating`: audio enviado al backend, esperando resultado.
- `qa_result`: resultado de la ronda visible al usuario.
- `qa_unintelligible`: el audio de la ronda no fue inteligible.
- `qa_complete`: todas las preguntas respondidas, esperando cierre de sesion.

Se agrego la interfaz `QARoundResult` con los campos `relevance`, `directness`, `conciseness`,
`overall`, `feedback`, `audio_intelligible`.

### Nuevos manejadores de mensajes WebSocket en useLiveSession

| Tipo de mensaje | Accion |
|---|---|
| `question` | Guarda `{text, number, total}` en `qaQuestion`. Transicion de fase a `qa_question`. |
| `round_result` | Guarda `precision` en `qaLastResult`. Transicion a `qa_result`. |
| `round_unintelligible` | Transicion a `qa_unintelligible`. |
| `session_complete` | Transicion a `qa_complete`. |

El hook expone `sendAnswerDone()`: envia `{"type": "answer_done"}` al backend y transiciona la fase
a `qa_evaluating` inmediatamente, antes de recibir confirmacion del backend.

### Indicador de nivel de ruido

El hook `useLiveSession` calcula el nivel de ruido directamente desde los chunks PCM que produce
`AudioCapture`. En cada chunk recibido, se calcula el RMS de las muestras Int16 y se clasifica:

- RMS > 1500: `'high'`
- RMS > 600: `'medium'`
- RMS <= 600: `'low'`

El estado `noiseLevel` se actualiza en cada chunk. `LiveRecordingScreen` muestra un indicador
visual de tres barras con colores (`text-success`, `text-warning`, `text-danger`) que refleja
el nivel actual.

### Boton "Termine de responder"

El boton es visible en `LiveRecordingScreen` cuando:
1. La dimension `'precision'` esta en `selectedDims`.
2. La fase actual es `'qa_question'`.

Al pulsarlo se llama `sendAnswerDone()`, que transiciona a `'qa_evaluating'` y envia el mensaje
al backend. El backend usa esto como senal de fin de respuesta alternativa a la deteccion de silencio.

### Reutilizacion de componentes de precision

`LiveRecordingScreen` importa `QuestionCard` desde el modulo de precision
(`features/precision/presentation/components/molecules/QuestionCard`). Esto garantiza consistencia
visual entre el modo standalone y el modo Q&A de sesion libre.

Como el backend de sesion libre no envia la categoria de la pregunta en el mensaje `question`,
se usa la cadena fija `"Precision"` como valor de la prop `category` en el contexto de sesion libre.

### Compatibilidad con el modo de analisis continuo

La dimension `'precision'` puede coexistir con las otras dimensiones (`pron`, `acc`, `mul`).
En ese caso, `analysis_timer` en el backend analiza continuamente las dimensiones estandar,
mientras que `qa_mode` gestiona el ciclo de preguntas en paralelo. El audio se escribe en ambos
buffers desde `stream_audio`.
