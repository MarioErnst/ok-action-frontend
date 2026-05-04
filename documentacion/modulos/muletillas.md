# Modulo de Muletillas — Frontend

## 1. Descripcion funcional

El modulo de Muletillas detecta palabras de relleno (muletillas) en las respuestas orales del
usuario. El flujo es: el backend genera una pregunta aleatoria, el usuario graba su respuesta,
el audio se envia al backend que lo evalua con Gemini, y se presentan los resultados con puntajes
de fluidez, muletillas detectadas y retroalimentacion especifica.

## 2. Flujo de usuario

1. Al entrar a la pagina, el sistema carga automaticamente una pregunta aleatoria desde el backend.
2. El usuario lee la pregunta en la pantalla `QuestionScreen` y decide si responder o cargar otra.
3. Al iniciar la grabacion, la pantalla `RecordingScreen` muestra la pregunta durante la grabacion.
4. Al detener, el audio se envia al backend; mientras se espera aparece un indicador de carga.
5. Los resultados se presentan en `MuletillasResults` con puntajes y lista de muletillas detectadas.
6. El usuario puede reiniciar la sesion para intentar con una nueva pregunta.

## 3. Arquitectura del modulo

```
src/features/muletillas/
  domain/
    MuletillasSession.ts         tipos de dominio: MuletillasEvaluation, MuletillaItem
  infrastructure/
    dto/MuletillasDtos.ts        tipos que reflejan la respuesta HTTP del backend
    mappers/muletillasMapper.ts  conversion DTO → tipos de dominio
    repositories/HttpMuletillasRepository.ts  llamadas HTTP
  presentation/
    hooks/
      useMuletillasSession.ts    logica de sesion: fases, grabacion, evaluacion, guardado
    pages/
      MuletillasPage.tsx         orquestador de vistas segun la fase
    components/organisms/
      QuestionScreen.tsx         muestra la pregunta y controles de inicio
      RecordingScreen.tsx        grabacion activa con la pregunta visible
      MuletillasResults.tsx      resultados completos de la evaluacion
    components/molecules/
      MuletillasDetail.tsx       detalle de cada muletilla detectada
      QuestionCard.tsx           tarjeta con la pregunta
    components/atoms/
      MuletillasBadge.tsx        indicador visual de severidad de una muletilla
```

## 4. Hook principal: useMuletillasSession

### Fases de la sesion

```typescript
type MuletillasPhase = 'idle' | 'question' | 'recording' | 'evaluating' | 'results'
```

- **idle**: estado inicial; `MuletillasPage` dispara `loadQuestion` automaticamente.
- **question**: pregunta cargada y visible; el usuario puede grabar o cargar otra.
- **recording**: grabacion activa via `useAudioRecorder`.
- **evaluating**: audio enviado al backend; se espera la respuesta de Gemini.
- **results**: evaluacion recibida y mapeada al dominio.

### Carga de preguntas

`loadQuestion` llama a `HttpMuletillasRepository.getRandomQuestion()` que hace
`GET /api/muletillas/questions/random`. Actualiza el estado `question` y la ref `questionRef`.
La ref preserva el valor de la pregunta durante el ciclo de evaluacion asincrona aunque el
estado de React pueda haber cambiado.

### Grabacion y evaluacion

`stopAndEvaluate` detiene la grabacion, obtiene el `Blob` de audio y llama a
`HttpMuletillasRepository.evaluateResponse(audioBlob, questionRef.current)`.
El backend devuelve la evaluacion de Gemini; el DTO se mapea al tipo de dominio y se guarda en
`evaluationResult`.

### Guardado de sesion no bloqueante

Inmediatamente despues de recibir la evaluacion, se llama a
`HttpMuletillasRepository.saveSession(...)` con los datos del DTO original (campos snake_case).
Esta llamada es no bloqueante: usa `.catch` para loguear errores sin interrumpir la visualizacion
de resultados. El usuario ve los resultados independientemente de si el guardado tiene exito.

## 5. Capa de infraestructura

### DTO

`MuletillasDtos.ts` define la respuesta HTTP del backend:

```typescript
interface MuletillasEvaluationDto {
  overall_score: number
  fluency_score: number
  muletillas_score: number
  total_muletillas_count: number
  muletillas_per_minute: number
  muletillas_detected: MuletillaItemDto[]
  feedback: string
  strengths: string
  improvement_areas: string
}

interface MuletillaItemDto {
  word: string
  count: number
  severity: 'alta' | 'media' | 'baja'
  suggestion: string
}
```

### Mapper

`toMuletillasEvaluation` convierte el DTO al tipo de dominio `MuletillasEvaluation` con camelCase:
`overallScore`, `fluencyScore`, `muletillasScore`, `totalMuletillasCount`, `muletillasPerMinute`,
`muletillasDetected`, `feedback`, `strengths`, `improvementAreas`.

### Repository

- `getRandomQuestion`: `GET /api/muletillas/questions/random` → `{ question: string }`.
- `evaluateResponse`: `POST /api/muletillas/evaluate` con `FormData` conteniendo `audio` (Blob)
  y `question_text` (string).
- `saveSession`: `POST /api/muletillas/sessions` con JSON de los campos de la sesion.

## 6. Tipos de dominio

```typescript
interface MuletillaItem {
  word: string
  count: number
  severity: 'alta' | 'media' | 'baja'
  suggestion: string
}

interface MuletillasEvaluation {
  overallScore: number
  fluencyScore: number
  muletillasScore: number
  totalMuletillasCount: number
  muletillasPerMinute: number
  muletillasDetected: MuletillaItem[]
  feedback: string
  strengths: string
  improvementAreas: string
}
```

## 7. Manejo de errores en la UI

Los errores se muestran en espanol en un bloque visible debajo del contenido principal.
El estado `evaluationError` cubre dos casos: fallo al cargar la pregunta y fallo al evaluar.
En caso de fallo en la evaluacion, la fase regresa a `'question'` para que el usuario pueda
intentarlo de nuevo sin perder la pregunta actual.
