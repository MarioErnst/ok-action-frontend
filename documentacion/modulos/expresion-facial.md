# Módulo: Expresión Facial (live emotion tracking)

## Qué hace

Análisis facial en tiempo real, sin preguntas guiadas. El usuario abre la pantalla, presiona "Iniciar análisis" y la cámara muestra su rostro con una malla wireframe superpuesta mientras un panel HUD informa qué emoción dominante y qué gestos se están detectando. Al presionar "Detener", la sesión se persiste y se muestra el histograma de distribución emocional.

## Ruta

`/expresion-facial` — protegida, dentro del layout principal de la app.

## Arquitectura del módulo

```
features/facial-expression/
├── domain/
│   └── FacialExpression.ts          # EmotionId, GestureId, EmotionScores, GestureScores, LiveDetection,
│                                    #   EmotionEvent, SessionResult, TrackingStatus
├── infrastructure/
│   ├── dto/FacialExpressionDtos.ts  # SaveSessionDto = { duration_ms, events[] }
│   └── repositories/HttpFacialExpressionRepository.ts  # Cliente HTTP con timeout 30s
├── services/
│   ├── faceDetectionService.ts      # MediaPipe FaceLandmarker — emite blendshapes + landmarks
│   ├── emotionClassifier.ts         # Heurísticas FACS: blendshapes -> {emotions, gestures, dominant}
│   └── landmarkRenderer.ts          # Dibuja la malla en canvas con DrawingUtils
└── presentation/
    ├── hooks/
    │   ├── useFaceDetector.ts        # Carga modelo, controla cámara, expone setDetectionCallback / setLandmarksCallback
    │   └── useEmotionTracking.ts     # Orquestador: status, eventos, persistencia
    ├── components/
    │   ├── emotionStyles.ts          # Tokens compartidos: labels y colores por emoción/gesto
    │   ├── atoms/
    │   │   ├── EmotionLabel.tsx          # Texto de emoción con su color
    │   │   ├── EmotionBar.tsx            # Barra horizontal con label + porcentaje
    │   │   ├── GestureChip.tsx           # Pill con label + intensidad opcional
    │   │   └── IntensityRing.tsx         # Anillo SVG que se llena con la intensidad
    │   ├── molecules/
    │   │   ├── LiveCameraOverlay.tsx     # <video> mirror + canvas overlay con la malla
    │   │   └── EmotionHUD.tsx            # Panel: dominante + top 3 emociones + gestos top-N
    │   └── organisms/
    │       ├── LiveDetectionView.tsx     # Pantalla en vivo (cámara + HUD + cronómetro + Detener)
    │       └── SessionResultsView.tsx    # Resultados: ring score + histograma + gestos + acciones
    └── pages/FacialExpressionPage.tsx    # Status-driven: idle → live → saving → results | error
```

## Flujo de estados

```
                  startTracking()
idle ────────────────────────────────────► live
 ▲                                          │
 │                                          │ stopTracking()
 │ reset() / "Volver al inicio"             ▼
results ◄────── POST /sessions ─────── saving
                                            │
                                            │ catch
                                            ▼
                                          error
                                            │
                                            │ reset()
                                            └──► idle
```

## Detección y clasificación

### MediaPipe FaceLandmarker

- Modelo: `face_landmarker.task` (~3.7MB, float16, versión `1`), CDN de Google Cloud Storage.
- WASM: jsDelivr, pinned a `0.10.32` para coincidir con `@mediapipe/tasks-vision` en `package.json`.
- Salidas usadas: `faceBlendshapes` (52 valores ARKit-style) y `faceLandmarks` (478 puntos).
- Cap a 15fps (`FRAME_INTERVAL_MS = 1000/15`) para no sobrecargar móvil.

### Heurísticas FACS (emotionClassifier.ts)

Las fórmulas vienen del Facial Action Coding System de Ekman (gold standard académico). NO inventadas: combinan los blendshapes que MediaPipe expone con los Action Units canónicos.

| Emoción     | Fórmula                                                                  | AUs FACS         |
|-------------|--------------------------------------------------------------------------|------------------|
| `happy`     | `avg(mouthSmileL,R) + avg(cheekSquintL,R) * 0.5`                         | AU6 + AU12       |
| `sad`       | `avg(mouthFrownL,R) + browInnerUp * 0.5`                                 | AU1 + AU15       |
| `angry`     | `avg(browDownL,R) + avg(mouthPressL,R) * 0.6`                            | AU4 + AU7 + AU23 |
| `surprise`  | `(jawOpen + browInnerUp)/2 + avg(eyeWideL,R) * 0.5`                      | AU1 + AU2 + AU5 + AU26 |
| `fear`      | `((jawOpen + browInnerUp + avg(mouthStretchL,R))/3) * 0.6`               | AU1 + AU2 + AU20 |
| `disgust`   | `avg(noseSneerL,R) + avg(mouthUpperUpL,R) * 0.5`                         | AU9 + AU10       |
| `neutral`   | `1 - max(otras emociones)`                                               | —                |

Si la emoción dominante (no neutral) no supera `NEUTRAL_DOMINANCE_THRESHOLD = 0.2`, se elige `neutral` para evitar parpadeo de señales débiles.

### Gestos

Set curado de 19 gestos (subset de los 52 blendshapes), con label en español: sonrisa, ceño fruncido, labios apretados, boca abierta, etc. Un gesto se considera "activo" cuando supera `GESTURE_ACTIVE_THRESHOLD = 0.25`.

## Captura de datos

Solo se persiste un evento cuando la **emoción dominante cambia**. Cada evento guarda:

- `t_ms`: milisegundos desde `startTracking()`.
- `emotion`: id de la nueva emoción dominante.
- `gestures`: snapshot de los gestos activos (>= 0.25) en ese instante.

Esto da sesiones compactas: ~10–50 eventos en una sesión de 1–2 minutos. El backend recibe `{ duration_ms, events[] }` y calcula la distribución temporal server-side.

## Render de la malla

`landmarkRenderer.ts` usa `DrawingUtils` oficial de `@mediapipe/tasks-vision`:

```
drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION,
               { color: 'rgba(255,255,255,0.28)', lineWidth: 0.6 })
```

Más una pasada extra sobre `FACE_LANDMARKS_LEFT_EYE`, `..._RIGHT_EYE` y `..._LIPS` con un blanco más fuerte (0.55) para reforzar las zonas más expresivas.

El canvas se sincroniza con el video en tamaño y device-pixel-ratio (alta resolución en pantallas Retina). El video y el canvas se espejan con `scale-x-[-1]` para que el usuario se vea en modo selfie y la malla siga su rostro.

## Compatibilidad iOS

- `<video autoPlay muted playsInline>` (los tres atributos obligatorios).
- `audio: false` en `getUserMedia` para no encender el micrófono accidentalmente.
- `h-[100dvh]` en lugar de `h-screen`.
- `pb-safe` en el botón Detener para respetar la home indicator.
- `await videoEl.play()` envuelto en try/catch que libera tracks ante error.
- AudioContext eliminado por completo (ya no hay VAD).

## Decisiones de diseño

### Captura por evento, no por frame
Guardar 15 frames por segundo durante 2 minutos serían 1800 muestras pesadas. Capturar **solo cuando cambia la emoción dominante** baja a ~30 eventos típicos sin perder información útil para analytics.

### Forwarding directo sin pasar por React state
El detection callback viaja por `setDetectionCallback`/`setLandmarksCallback` (refs estables) en lugar de `useEffect([blendshapes])`. Esto evita que React batch consecutive frames y pierda eventos durante render.

### Smoothing solo para la UI
El HUD usa LERP (factor 0.25) sobre las barras de emociones para que no parpadeen. Los **eventos guardados usan los valores crudos** del clasificador, sin smoothing.

### Anti double-click con `statusRef`
Los handlers (`startTracking`, `stopTracking`) muta `statusRef.current` inmediatamente al validar el guard, antes de hacer `setStatus`. Un segundo click en el mismo tick encuentra el ref ya cambiado y retorna sin hacer nada.

### Cap responsive de gestos
En portrait (<1024px) se muestran los **top 4 gestos por intensidad**; en lg se muestran 10. Si hay más activos, se ocultan los menos intensos en mobile para evitar que el HUD desborde.

### No emojis, sí color y forma
La identidad visual usa el design system existente (accent ámbar, surface, text-muted) y diferencia emociones por color (amber=feliz, sky=triste, red=enojado, violet=sorpresa, fuchsia=miedo, emerald=asco, muted=neutral) más label en español.

## Integración con el backend

- **POST** `/facial-expression/sessions` — body: `{ duration_ms: number, events: EmotionEvent[] }`. Timeout cliente: 30s.
- **GET** `/facial-expression/sessions` — lista con `dominant_emotion` y `dominant_percentage`.
- **GET** `/facial-expression/sessions/{id}` — detalle con distribución y eventos. UUID malformado → 404.
- Backend valida emociones contra `ALLOWED_EMOTIONS` y rechaza con 422 valores no permitidos.
