# Módulo: Expresión Corporal

## Qué hace

Evalúa presencia corporal mientras el usuario responde una consigna oral frente a cámara. El análisis corre en el navegador con MediaPipe Pose Landmarker; el backend solo recibe métricas agregadas y devuelve feedback.

No graba ni sube video. Tampoco forma parte de sesión libre en esta fase, porque sesión libre actual es audio-only.

## Ruta

`/expresion-corporal` — protegida, dentro del layout principal.

## Arquitectura del módulo

```text
features/body-expression/
  domain/BodyExpression.ts
  services/
    poseDetectionService.ts
    handPresenceFilter.ts
    bodyExpressionAnalysis.ts
    poseRenderer.ts
    questions.ts
  infrastructure/
    dto/BodyExpressionDtos.ts
    mappers/bodyExpressionMapper.ts
    repositories/HttpBodyExpressionRepository.ts
  presentation/
    hooks/
      usePoseDetector.ts
      useBodyExpressionSession.ts
    components/
      atoms/
      molecules/
      organisms/
    pages/BodyExpressionPage.tsx
```

## Flujo de estados

```text
idle
  -> calibrating
  -> live
  -> saving
  -> results
```

Errores de cámara, mala calibración o tracking insuficiente terminan en `error` o en un resultado no guardado con recomendación de reintento.

## Detección

`poseDetectionService.ts` carga:

- WASM de `@mediapipe/tasks-vision@0.10.35`
- modelo principal `pose_landmarker_full.task`
- fallback a `pose_landmarker_lite.task` si el modelo full no carga
- `runningMode='VIDEO'`
- `numPoses=1`
- umbrales MediaPipe en `0.35` para detección, presencia y tracking
- límite de 18 FPS

El servicio emite landmarks normalizados. El canvas dibuja una malla corporal simple sobre el video espejado. Para equilibrar sensibilidad y falsos positivos, el overlay usa un umbral visual de `0.35` para cuerpo y `0.45` para muñecas.

`handPresenceFilter.ts` valida las muñecas antes de que el overlay o las métricas las usen. Una mano debe sostener evidencia temporal y geométrica: hombro/codo/muñeca del mismo lado visibles, distancias razonables respecto al ancho de hombros y ausencia de saltos imposibles. La activación requiere 3 de los últimos 5 frames; si una mano real se pierde brevemente, se toleran hasta 2 frames sin apagarla. Si aparece una muñeca visible pero geométricamente inválida, se corta de inmediato para evitar manos fantasma por objetos o movimiento de fondo.

## Análisis local

`bodyExpressionAnalysis.ts` calcula:

- postura;
- apertura corporal;
- gesticulación;
- estabilidad;
- energía;
- encuadre;
- porcentaje de pose visible;
- porcentaje de manos visibles;
- movimiento excesivo;
- calidad de calibración;
- modo de encuadre.

La calibración inicial dura cerca de 3 segundos y estima una base corporal propia del usuario.

La medición usa umbrales internos más estrictos que el overlay: `0.42` para landmarks corporales y `0.50` para muñecas. Además, `handsVisible`, `activeGesture`, `handsVisiblePct` y las conexiones mano-brazo del canvas usan la decisión filtrada de `handPresenceFilter.ts`. Así el esqueleto puede verse fluido sin contar manos de baja confianza o muñecas aisladas como manos reales. La calidad mínima de calibración para avanzar es `45`.

## Persistencia

El frontend llama:

```text
POST /body-expression/sessions
```

Payload:

- `started_at`
- `ended_at`
- `prompt_text`
- `metrics`

No envía video, landmarks, frames ni timeline crudo.

## Reglas de guardado

El frontend no persiste si:

- la sesión dura menos de 20 segundos;
- `trackedPct < 40`;
- no hay calibración válida.

El backend repite las validaciones críticas antes de insertar.

## UI

La UI usa Atomic Design pragmático:

- atoms: score ring, barras de métrica, pills de estado;
- molecules: consigna, calidad de tracking, overlay de cámara;
- organisms: calibración, sesión en vivo, resultados;
- page: orquestación de estados.

La pagina usa `min-h-[100dvh]` en lugar de `min-h-screen` para que Safari/iOS
calcule la altura visible con sus barras dinamicas y no corte acciones inferiores.

## Feedback

El resultado inmediato muestra feedback del backend. Si Gemini responde, el panel marca `Gemini`; si falla, se usan reglas determinísticas. El texto no se guarda en BD.
