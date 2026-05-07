# Módulo: Expresión Facial

## Descripción

Evalúa tres expresiones faciales mientras el usuario habla: puchero de labios (mouthPucker), ceño fruncido (browDown) y labios hacia abajo (mouthFrown). La detección ocurre en el cliente usando MediaPipe FaceLandmarker; el backend calcula todos los puntajes.

## Ruta

`/expresion-facial` — protegida, incluida en el layout principal de la aplicación.

## Arquitectura del módulo

```
features/facial-expression/
├── domain/
│   └── FacialExpression.ts          # Tipos TypeScript: BlendshapeFrame, Baseline, QuestionPayload, SessionResult, SessionPhase, LiveBlendshapes
├── infrastructure/
│   ├── dto/FacialExpressionDtos.ts  # DTOs para comunicación con la API
│   └── repositories/HttpFacialExpressionRepository.ts  # Cliente HTTP (usa apiRequest)
├── services/
│   ├── faceDetectionService.ts      # MediaPipe FaceLandmarker: carga del modelo, acceso a cámara, loop de detección
│   └── voiceActivityDetector.ts     # Web Audio API VAD: detecta presencia de voz en el micrófono
├── questions.ts                     # Preguntas predefinidas (5 preguntas fijas)
└── presentation/
    ├── hooks/
    │   ├── useFaceDetector.ts        # Wrapper del servicio: expone blendshapes (suavizados, para UI) + setRawFrameCallback (frames crudos, para captura)
    │   ├── useVoiceActivity.ts       # Wrapper del VAD; expone isSpeaking
    │   └── useExpressionSession.ts  # Orquestador: maneja fases, calibración, grabación y envío
    ├── components/
    │   ├── atoms/ExpressionBar.tsx          # Barra de progreso con umbral (rojo si supera el threshold)
    │   ├── molecules/CameraView.tsx         # Video con atributos iOS obligatorios: autoPlay muted playsInline
    │   ├── molecules/ExpressionPanel.tsx    # Tres ExpressionBar con umbrales: pucker=0.15, brow=0.12, lips=0.12
    │   ├── molecules/QuestionCard.tsx       # Muestra texto de pregunta, número y estado de grabación
    │   ├── molecules/VoiceIndicator.tsx     # Animación de barras que indica actividad de voz
    │   ├── organisms/CalibrationScreen.tsx  # Pantalla de calibración neutral con barra de progreso
    │   ├── organisms/RecordingSession.tsx   # Pantalla de grabación: layout responsive columna/lado a lado
    │   └── organisms/SessionResults.tsx     # Resultados: ScoreCircle SVG + tabla por pregunta
    └── pages/FacialExpressionPage.tsx       # Página principal: coordina los tres hooks y enruta por fase
```

## Flujo de fases

```
loading → calibration → question → recording → (siguiente pregunta o) submitting → results
                                                                              ↓ (error)
                                                                             error
```

- **loading**: el modelo MediaPipe se descarga desde CDN y la cámara se inicia.
- **calibration**: 75 frames (~5 segundos) de cara neutral para establecer el baseline.
- **question**: se muestra la pregunta al usuario; puede iniciar la grabación.
- **recording**: se capturan frames de blendshapes a 15fps y se detecta voz con Web Audio API.
- **submitting**: se envían baseline + frames al backend vía POST `/facial-expression/sessions`.
- **results**: se muestra el puntaje general (ScoreCircle) y el desglose por pregunta.

## Detección MediaPipe

- Modelo: `face_landmarker_lite` (~5MB), cargado desde Google Cloud Storage.
- WASM: cargado desde jsDelivr CDN.
- Frecuencia máxima: 15fps (`FRAME_INTERVAL_MS = 1000/15`) para preservar batería en móvil.
- Suavizado LERP con factor 0.2 para reducir jitter sin introducir latencia visible.

## Calibración de baseline

- 75 frames de expresión neutral al inicio de cada sesión.
- El baseline es el promedio de los tres blendshapes durante esos 75 frames.
- Los puntajes del backend miden desviación por encima del baseline, no valores absolutos.

## Detección de voz (VAD)

- Web Audio API: `AudioContext` + `AnalyserNode`.
- Umbral: -50 dBFS. Timeout de silencio: 1500ms.
- Se usa `await audioCtx.resume()` tras la creación porque iOS Safari crea el contexto en estado suspendido.
- Se prohibió Web Speech API porque no está disponible en iOS Safari.

## Compatibilidad iOS

- `video` con atributos `autoPlay muted playsInline` (obligatorio para que el video se reproduzca sin intervención del usuario).
- `h-[100dvh]` en lugar de `h-screen` para el viewport correcto en iOS con barra de Safari visible.
- `audio: false` en getUserMedia para evitar captura accidental de audio al iniciar la cámara.
- `await audioCtx.resume()` en VoiceActivityDetector para desbloquearlo en iOS.

## Captura de frames sin pérdida

Los frames capturados por MediaPipe se entregan a `useExpressionSession` mediante un callback registrado vía `useFaceDetector.setRawFrameCallback`, no a través de un `useEffect` sobre el estado `blendshapes`.

Por qué importa: si los frames se forwardearan vía `useEffect([blendshapes])`, dos updates de `setBlendshapes` que cayeran en el mismo batch de React harían que solo el último se observara y el frame intermedio se perdería. Como el scoring del backend depende del histograma de frames sobre/bajo el umbral, perder frames sesgaría el puntaje.

El callback se ejecuta directamente desde el loop de detección, fuera del ciclo de render de React, así no hay batching que comprima frames.

## Smoothing solo para la UI

El suavizado LERP (factor 0.2) en `useFaceDetector` se aplica únicamente al estado `blendshapes` que alimenta los `ExpressionBar` visuales. Los frames que llegan al backend vía `setRawFrameCallback` son **crudos** (sin smoothing), porque el scoring espera valores tal como los entrega MediaPipe.

## Robustez y limpieza de recursos

### Timeout en `saveSession`

`HttpFacialExpressionRepository.saveSession` usa un `AbortController` con timeout de 30 segundos. Si el backend no responde en ese plazo, la promesa se rechaza con `Error('Tiempo de espera agotado al guardar la sesión.')` y la UI pasa a fase `error` con un botón "Reintentar". Sin esto, el spinner de "Guardando resultados..." podía quedar girando indefinidamente.

### Validación de baseline

Después de promediar los 75 frames de calibración, se valida que cada componente del baseline sea finito y esté en `[0, 1]`. Si alguno es `NaN`, `Infinity` o está fuera de rango (por glitches puntuales de MediaPipe), la sesión pasa a fase `error` y no se envía nada al backend.

### Error explícito si baseline falta

`submitSession` antes terminaba silenciosamente si `baselineRef.current` era `null`, dejando la UI colgada en fase `submitting`. Ahora setea `error` y pasa a fase `error` con un mensaje claro.

### Limpieza de cámara y micrófono

- `FaceDetectionService.startCamera` envuelve `videoEl.play()` en try/catch y llama a `stream.getTracks().forEach(t => t.stop())` si falla, evitando que el indicador de cámara del navegador siga encendido tras un error de iOS.
- `VoiceActivityDetector.start` envuelve toda la inicialización (getUserMedia + AudioContext + nodos) en try/catch y llama a `this.stop()` ante cualquier fallo, liberando el `AudioContext` y los tracks del micrófono.
- `useFaceDetector` mantiene un `mountedRef` para descartar `setState` que llegue después del unmount (por promesas en vuelo de `load()` o frames tardíos).
- `FaceDetectionService.dispose()` ya invoca `stopCamera()` internamente, así que el cleanup del `useEffect` de `useFaceDetector` libera todo en un solo paso.

### Anti double-click

Las transiciones de fase críticas (`startCalibration`, `startQuestion`, `finishQuestion`) leen un `phaseRef` que se mutea **inmediatamente** dentro del callback antes de hacer `setPhase`. Un segundo click en el mismo tick encuentra `phaseRef` ya cambiado y retorna sin hacer nada. Sin esto, un doble-click rápido reseteaba `questionStartTimeRef` y los frames acumulados.

## Decisiones de diseño

### MediaPipe lite model (no full model)
El modelo full pesa ~30MB y tarda varios segundos en descargar en redes lentas. El modelo lite (~5MB) detecta los blendshapes necesarios con precisión suficiente para esta evaluación.

### Frontend captura, backend puntúa
Se decidió que el frontend envíe frames crudos (blendshapes + timestamps) y el backend calcule todos los puntajes. Esto permite cambiar el algoritmo de scoring sin actualizar la app del cliente.

### useCallback en todos los callbacks exportados por useExpressionSession
`onCalibrationFrame`, `onRecordingFrame`, `startCalibration`, `startQuestion`, `finishQuestion`, `reset`, y `submitSession` están envueltos en `useCallback` porque algunos se usan como dependencias de `useEffect` en `FacialExpressionPage`. Sin esto, los efectos se re-ejecutarían en cada render.

### questionIndexRef para finishQuestion
`finishQuestion` necesita leer el índice de pregunta actual dentro de un `useCallback` estable (deps: `[submitSession]`). Para evitar un closure desactualizado sobre el estado `questionIndex`, se mantiene un `questionIndexRef` que siempre refleja el valor actual y se actualiza junto con `setQuestionIndex`.

### setResult antes de setPhase('results')
En `submitSession`, `setResult(sessionResult)` se llama antes de `setPhase('results')` para garantizar que `SessionResults` siempre reciba un `result` no nulo en su primer render. React 18 en modo concurrente puede renderizar entre actualizaciones de estado separadas en contexto async.

## Integración con el backend

- **POST** `/facial-expression/sessions` — cuerpo: `{ baseline, questions }`. Timeout de 30s del lado del cliente.
- **GET** `/facial-expression/sessions` — lista de sesiones del usuario autenticado.
- **GET** `/facial-expression/sessions/{id}` — detalle de una sesión. Devuelve 404 si el UUID es inválido o no existe.
- Los puntajes retornados son enteros `0–100` o `null` (si no se pudo calcular). `SessionResults` renderiza `null` como em-dash (`—`) para distinguir "sin datos" de "puntaje cero".
