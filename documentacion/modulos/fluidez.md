# Módulo de Fluidez — Frontend

## 1. Descripción funcional

El módulo de Fluidez permite practicar respuestas orales a consignas específicas con retroalimentación en tiempo real. Evalúa continuidad, ritmo, bloqueos, repeticiones, reinicios y concordancia con lo pedido.

La interfaz no corta la grabación ante cada problema. Muestra advertencias mientras el usuario sigue hablando y deja el resumen disponible al terminar.

## 2. Navegación

La página está disponible en `/fluidez` y aparece en la navegación como "Fluidez".

## 3. Estructura de archivos

```text
src/features/fluency/
  domain/FluencySession.ts
  presentation/components/FluencyFeedbackPanel.tsx
  presentation/hooks/useFluencySession.ts
  presentation/pages/FluencyPage.tsx
  services/questions.ts
  index.ts
```

## 4. Hook principal

`useFluencySession` centraliza el flujo:

```typescript
type FluencyPhase = 'idle' | 'connecting' | 'recording' | 'ended'
```

Responsabilidades:

- manejar conexión WebSocket a `/fluency/session`;
- enviar la consigna inicial;
- iniciar y detener `AudioCapture`;
- acumular análisis recibidos;
- mostrar advertencias (`warningReason`);
- calcular y mostrar `averageScore` al finalizar.

## 5. Contrato de análisis

El backend devuelve `FluencyAnalysis` con:

- `audio_intelligible`;
- `score`;
- `fluency_score`;
- `continuity_score`;
- `rhythm_score`;
- `prompt_alignment_score`;
- `coherence_score`;
- `classification`;
- `stuck_events`;
- `repetitions`, `restarts`, `long_blocks`;
- `wpm`;
- `pace_feedback`;
- `strengths`;
- `improvement_areas`;
- `fb`.

El panel muestra score, WPM, concordancia, coherencia, eventos de trabas, fortalezas y áreas de mejora. No muestra transcripción completa porque todavía no hay una capa Speech-to-Text autoritativa.

## 6. Advertencias

`FluencyFeedbackPanel` distingue:

| Warning | Mensaje |
|---------|---------|
| `audio_not_intelligible` | No se entiende suficiente audio para evaluar. |
| `not_aligned_with_prompt` | La respuesta se aleja de la consigna. |
| `low_fluency_score` | La fluidez bajó demasiado. |
| `fluency_blocks_detected` | Se detectaron trabas o repeticiones relevantes. |
| `time_limit` | La sesión llegó al límite de tiempo. |

## 7. Integración con Sesión Libre

La dimensión `"fluency"` también se puede seleccionar en sesión libre. En ese flujo el frontend:

- agrega "Fluidez" al selector de dimensiones;
- muestra clasificación y WPM en el feedback en vivo;
- muestra WPM, repeticiones, bloqueos y nota en el resumen;
- permite navegar a `/fluidez` desde la corrección o resumen si el score baja del umbral.

## 8. Decisiones de diseño

### Evaluación no intrusiva

La práctica de fluidez busca que el usuario termine su idea. Por eso se muestran warnings sin cortar la sesión inmediatamente.

### Concordancia con consigna

El panel incluye `prompt_alignment_score` porque una respuesta puede sonar fluida pero no responder lo pedido. Esto replica la robustez del módulo de Precisión sin duplicar su foco: Precisión mide relevancia/directez/concisión; Fluidez mide continuidad oral y usa concordancia como control de calidad del intento.

### Audio compartido

El módulo reutiliza `AudioCapture`, la misma infraestructura usada por sesión libre. La captura envía PCM 16 kHz mono al backend.
