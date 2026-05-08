# Módulo: Versatilidad Lingüística

## Qué hace

Evalúa qué tan variado es el vocabulario del usuario al hablar. Le da un puntaje 0-100, un nivel de riqueza léxica (básico / intermedio / avanzado) y un feedback textual concreto.

Esta feature ofrece únicamente el **modo guiado** (3 preguntas predefinidas, una respuesta por pregunta).

> **Modo libre**: para hablar libremente y recibir una evaluación de versatilidad sobre todo el discurso, usar la **Sesión Libre** (`/sesion-libre`) y seleccionar la dimensión "Versatilidad" en el selector de dimensiones. La evaluación se entrega al final de la sesión libre junto con las otras dimensiones elegidas.

## Ruta

`/versatilidad-linguistica` — protegida, dentro del layout principal.

## Arquitectura del módulo

```
features/linguistic-versatility/
├── domain/
│   └── LinguisticVersatility.ts         # Tipos: RichnessLevel, SessionMode, RoundResult, GuidedStatus, FreeStatus, etc.
├── infrastructure/
│   └── HttpLinguisticVersatilityRepository.ts  # Cliente HTTP con timeout 60s, multipart audio
├── services/
│   └── audioRecorder.ts                 # Wrapper MediaRecorder con MIME adaptativo iOS / Android / desktop
└── presentation/
    ├── hooks/
    │   ├── useGuidedVersatilitySession.ts  # Orquesta idle → loading → review → recording → uploading → review → finalizing → results
    │   └── useFreeVersatilitySession.ts    # Orquesta idle → recording → uploading → results
    ├── components/
    │   ├── atoms/
    │   │   ├── RichnessBadge.tsx           # Pill con nivel 1/2/3 y color
    │   │   ├── ScoreRing.tsx               # SVG ring 0..100 con color por umbral
    │   │   └── RecordPulse.tsx             # Punto rojo pulsante (re-uso visual con facial)
    │   ├── molecules/
    │   │   ├── RecordButton.tsx            # Botón único con 3 estados: idle / recording / uploading
    │   │   ├── QuestionCard.tsx            # Card con pregunta + progreso "X de N"
    │   │   └── FeedbackPanel.tsx           # Score + RichnessBadge + texto de feedback
    │   └── organisms/
    │       ├── ModeSelector.tsx            # Card inicial: Guiado vs Libre
    │       ├── GuidedSessionView.tsx       # Pantalla de pregunta + grabación
    │       ├── FreeSessionView.tsx         # Pantalla de grabación libre con cronómetro
    │       └── SessionResultsView.tsx      # Resultados finales (score ring + detalle por pregunta)
    └── pages/LinguisticVersatilityPage.tsx # Status-driven: ModeSelector → GuidedFlow / FreeFlow
```

## Flujo guiado (3 preguntas)

```
ModeSelector ──► tracking.start() ──► loading
                                        │
                                        ▼
                                     review (mostrando pregunta N)
                                        │
                                        ▼ Iniciar grabación
                                     recording
                                        │
                                        ▼ Detener
                                     uploading ──► review (mostrando feedback de N)
                                        │
                                        ▼ Siguiente pregunta (o Finalizar)
                                     [N+1] o finalizing ──► results
```

`statusRef` mutado dentro de cada handler bloquea double-clicks rápidos.

## Flujo libre

```
ModeSelector ──► FreeSessionView (idle)
                          │
                          ▼ Iniciar grabación
                     recording (con cronómetro)
                          │
                          ▼ Detener
                     uploading ──► results (FeedbackPanel + ScoreRing)
```

## Servicio de grabación (audioRecorder.ts)

`AudioRecorder` envuelve `MediaRecorder` y resuelve los MIME types soportados por cada navegador:

| Plataforma             | MIME elegido            |
|------------------------|-------------------------|
| iOS Safari             | `audio/mp4`             |
| Chrome / Edge          | `audio/webm;codecs=opus`|
| Firefox desktop        | `audio/webm` u `audio/ogg` |

Todos están en la allow-list del backend. El blob resultante incluye su `type`, que el repositorio usa para derivar la extensión del archivo (`answer.mp4` o `answer.webm`) que ve Gemini.

Otros detalles del servicio:
- `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })` para limpiar el audio antes de enviarlo.
- `cancel()` libera el micrófono sin emitir blob — usado en cleanup de unmount.
- Sin Web Speech API (prohibida por CLAUDE.md, no funciona en iOS).

## Repositorio HTTP

`HttpLinguisticVersatilityRepository` cubre los 7 endpoints del backend:

- `startSession()` — abre sesión guiada
- `submitRound(sessionId, questionId, audio)` — multipart con audio
- `finalize(sessionId)` — cierra y trae detalle
- `abandon(sessionId)` — fire-and-forget en cleanup
- `getSession(sessionId)` — detalle
- `getHistory()` — lista
- `submitFreeSession(audio)` — modo libre, single-shot

Incluye `AbortController` con timeout de 60s en uploads de audio (la red puede ser lenta y Gemini puede tardar; sin timeout el spinner se quedaría girando indefinidamente).

## Decisiones de diseño

### Selector inicial vs auto-start
La pantalla inicial deja al usuario elegir explícitamente guiado o libre. Una vez elegido, el flujo guiado **arranca automáticamente** la sesión (no hay un segundo "Iniciar") porque el usuario ya manifestó la intención.

### Auto-abandon en unmount
Cuando el usuario navega fuera de la pantalla guiada con una sesión `active`, el hook hace `HttpLinguisticVersatilityRepository.abandon()` fire-and-forget. Mantiene la DB limpia sin obligar al usuario a un click extra.

### Tres estados, un solo botón (RecordButton)
Evita la ambigüedad de dos botones distintos. La etiqueta y el color cambian con el estado:
- `idle` → ámbar "Iniciar grabación"
- `recording` → rojo "Detener grabación" con punto pulsante
- `uploading` → gris con spinner "Enviando audio…"

### Anti double-click vía statusRef
Cada hook (`useGuided`, `useFree`) mantiene `statusRef.current` que se mutea **inmediatamente** dentro del handler antes del `setStatus`. Una segunda llamada en el mismo tick encuentra el ref ya cambiado y returnea sin hacer nada. Sin esto, un usuario nervioso podría disparar dos uploads en paralelo.

### Mode selector con cards equal-weight
Ambos modos se presentan como cards visualmente equivalentes (tamaño, contraste). En mobile se apilan; desde `sm:` van side-by-side. Cada card tiene su propio gradient (ámbar para guiado, sky para libre) para que el usuario distinga rápido qué seleccionó.

## Compatibilidad multiplataforma

- **Layout responsive**: mobile-first; en `sm:` y arriba cambia la grilla del selector. El resto es columna scrolleable que se adapta.
- **iOS Safari**: `h-[100dvh]` (no `h-screen`), `pb-safe` en botones inferiores, `MediaRecorder` con MIME `audio/mp4`.
- **Touch targets**: ≥ 44x44px en todos los botones primarios (RecordButton es ~56px de alto).
- **Sin emojis** (regla del proyecto). Iconografía en SVG (`NavIcon` lexical: libro abierto).

## Integración con el backend

- POST/GET en `/linguistic-versatility/*` (ver doc del backend).
- Audio sube como `multipart/form-data` con campo `audio` y, en modo guiado, `question_id` como `Form` field.
- Errores se exponen al usuario en lenguaje claro (mensajes en español rioplatense).
