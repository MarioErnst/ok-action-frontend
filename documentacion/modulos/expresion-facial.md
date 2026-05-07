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
    │   ├── useFaceDetector.ts        # Wrapper del servicio de detección; expone blendshapes suavizados y videoRef
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

- **POST** `/facial-expression/sessions` — cuerpo: `{ baseline, questions }`.
- **GET** `/facial-expression/sessions` — lista de sesiones del usuario autenticado.
- **GET** `/facial-expression/sessions/{id}` — detalle de una sesión.
- Todos los puntajes retornados son enteros 0–100 (no floats 0.0–1.0).
