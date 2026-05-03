# Modulo de Acentuacion — Frontend

## 1. Descripcion funcional

El modulo de Acentuacion evalua el acento prosodico, la entonacion y el ritmo del usuario al
leer frases en voz alta. El flujo es identico al de Pronunciacion en estructura, pero con un
conjunto fijo de frases (sin seleccion de nivel) y metricas distintas: puntajes de pronunciacion
general, ritmo, entonacion y precision acentual. La evaluacion se realiza en el backend con Gemini.

## 2. Flujo de usuario

1. El usuario accede a la pagina de Acentuacion; la pantalla de grabacion aparece de inmediato.
2. Lee en voz alta cada frase y presiona "Siguiente" para enviar el audio y pasar a la siguiente.
3. Los audios se envian al backend de forma asincrona frase a frase.
4. Al terminar todas las frases, el sistema espera las evaluaciones pendientes.
5. Se muestra la pantalla de resultados con puntajes generales y errores especificos por palabra.
6. El usuario puede reiniciar la sesion.

## 3. Arquitectura del modulo

```
src/features/accentuation/
  hooks/
    useAccentuationSession.ts   logica de sesion: fases, grabacion, envio y agregacion
    useAudioRecorder.ts         copia local de useAudioRecorder (anterior a la version compartida)
  pages/
    AccentuationPage.tsx        orquestador de vistas: grabacion o resultados
  components/organisms/
    RecordingScreen.tsx         pantalla de grabacion activa con indicador por frase
    AccentuationResultsScreen.tsx  resultados con metricas y errores de acento
  infrastructure/
    dto/AccentuationDtos.ts     tipos que reflejan la respuesta HTTP del backend
    mappers/accentuationMapper.ts  conversion DTO → tipos de dominio
    repositories/HttpAccentuationRepository.ts  llamadas HTTP
  services/
    phrases.ts                  frases fijas de evaluacion de acentuacion
  types.ts                     AccentuationPhase, PhraseState, PhraseEvaluation, etc.
```

## 4. Hook principal: useAccentuationSession

La estructura es identica a `usePronunciationSession` con las siguientes diferencias:

- No hay seleccion de nivel: las frases provienen de la constante `ACCENTUATION_PHRASES`.
- Las frases se inicializan en el estado con `buildInitialPhraseStates()` en el `useState`
  inicial, no en `startSession`, por lo que son visibles al usuario desde el primer render.
- `sendForEvaluation` llama a `HttpAccentuationRepository.evaluatePhrase` sin parametro `level`.
- `averageMetrics` es una funcion privada del hook (no esta en el mapper) que promedia los cinco
  campos de `EvaluationMetrics`.

### Fases

`idle` → `recording` → `processing` → `finished`

Identico a Pronunciacion. La transicion `processing → finished` ocurre cuando
`pendingEvaluationCount === 0`, calculando el resultado con `buildSessionResult`.

## 5. Capa de infraestructura

### DTO

`AccentuationDtos.ts` refleja la respuesta del backend:
`overall_score`, `pronunciation_score`, `rhythm_score`, `intonation_score`,
`stress_accuracy_score`, `feedback`, `specific_errors` (array con `word`, `expected_stress`,
`actual_issue`, `suggestion`).

### Mapper

`toPhraseEvaluation` convierte el DTO al tipo de dominio `PhraseEvaluation` con camelCase.
Los `specific_errors` se mapean a `StressError[]`.

### Repository

`HttpAccentuationRepository.evaluatePhrase` hace `POST /api/accentuation/evaluate` con
`FormData` conteniendo `audio` (Blob), `phrase_text` (string) y `phrase_index` (number).

## 6. Nota sobre useAudioRecorder

El modulo de Acentuacion tiene su propia copia de `useAudioRecorder` en `hooks/useAudioRecorder.ts`.
Esta copia es identica a `shared/hooks/useAudioRecorder.ts`. Existe por razon historica: el modulo
se implemento antes de crear el hook compartido. Ambas versiones son funcionalmente equivalentes.

## 7. Tipos de dominio

```typescript
interface EvaluationMetrics {
  overallScore: number
  pronunciationScore: number
  rhythmScore: number
  intonationScore: number
  stressAccuracyScore: number
}

interface StressError {
  word: string
  expectedStress: string
  actualIssue: string
  suggestion: string
}

interface PhraseEvaluation {
  phrase: { text: string }
  metrics: EvaluationMetrics
  feedback: string
  specificErrors: StressError[]
}

interface AccentuationSessionResult {
  metrics: EvaluationMetrics
  summaryFeedback: string
  phraseEvaluations: PhraseEvaluation[]
  timestamp: number
}
```
