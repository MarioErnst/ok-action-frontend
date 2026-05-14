# Modulo de Acentuacion — Frontend

## 1. Descripcion funcional

El modulo de Acentuacion evalua el acento prosodico, la entonacion y el ritmo del usuario al
leer frases en voz alta. El backend evalua cada frase con Gemini y devuelve los puntajes
agregados. El flujo es identico al de Pronunciacion en estructura, pero con un conjunto fijo
de frases (sin seleccion de nivel) y metricas distintas: puntajes de pronunciacion general,
ritmo, entonacion y precision acentual.

## 2. Flujo de usuario

1. El usuario accede a la pagina de Acentuacion; la pantalla muestra un loader breve mientras
   se cargan las frases desde el catalogo (`GET /accentuation/phrases`).
2. En estado `idle` ve la consigna inicial y, si tiene historial suficiente, la tarjeta
   "Tus frases más difíciles" con los 3 prompts donde su promedio historico es mas bajo.
3. Pulsa "Comenzar sesion": pasa a `recording`. Lee cada frase en voz alta y presiona
   "Siguiente" para enviar el audio y pasar a la siguiente.
4. Los audios se envian al backend de forma asincrona frase a frase.
5. Al terminar todas las frases, el sistema espera las evaluaciones pendientes (`processing`)
   y luego muestra los resultados (`finished`).
6. La sesion se persiste automaticamente con `POST /accentuation/sessions` incluyendo el
   desglose por frase: `phrase_index`, `prompt_id` y los 4 sub-scores. Esto alimenta el
   endpoint `/accentuation/insights/weakest-prompts` que renderiza la tarjeta.
7. El usuario puede reiniciar la sesion.

## 3. Arquitectura del modulo

```
src/features/accentuation/
  domain/
    AccentuationSession.ts            tipos del dominio (incluye promptId en PhraseEvaluation)
  infrastructure/
    dto/AccentuationDtos.ts           DTOs que reflejan la API (incluye AccentuationPhraseDto,
                                      *PhraseEvaluationInputDto, *EvaluationOutputDto,
                                      *WeakestPromptDto)
    mappers/accentuationMapper.ts     conversion DTO ↔ dominio; toSaveAccentuationSessionDto
                                      arma el payload con el array phrases[]
    repositories/HttpAccentuationRepository.ts  llamadas HTTP al backend
  presentation/
    hooks/
      useAccentuationSession.ts       logica de sesion: catalog fetch, fases, grabacion,
                                      envio y agregacion. Trackea promptId por phraseIndex
                                      para enviarlo con la sesion.
      useWeakestAccentuationPrompts.ts  carga las frases mas debiles (loading/ready/error)
      useAudioRecorder.ts             copia local de useAudioRecorder
    pages/
      AccentuationPage.tsx            orquestador: grabacion o resultados
    components/
      atoms/
        StressedPhrase.tsx            renderiza una frase con la silaba tonica resaltada
      molecules/
        AccentuationMetrics.tsx       barra con los 4 sub-scores
        EvaluationFeedback.tsx        feedback verbal + errores especificos
        PhraseCard.tsx                card de cada frase en la lista
        WeakestPhrasesCard.tsx        tarjeta "Tus frases más difíciles" (rendering puro)
      organisms/
        RecordingScreen.tsx           pantalla de grabacion + loader del catalogo +
                                      mounting de WeakestPhrasesCard en idle
        AccentuationResultsScreen.tsx resultados con metricas y errores
```

## 4. Hook principal: useAccentuationSession

Estructuralmente identico a `usePronunciationSession` con dos diferencias clave:

- **No hay seleccion de nivel**: el catalogo de acentuacion es plano (`category` solo cambia
  la etiqueta visual). El hook hace fetch de las frases al montarse.
- **Estado `catalogStatus`** (`loading` / `ready` / `error`) expuesto para que la pantalla
  pueda mostrar un loader o un mensaje de error antes de habilitar "Comenzar sesion".

### Fases

`idle` → `recording` → `processing` → `finished`

La transicion `processing → finished` ocurre cuando `pendingEvaluationCount === 0`. Al
terminar, el hook llama internamente a `HttpAccentuationRepository.saveSession` con el
payload completo (metricas agregadas + array `phrases[]` con `prompt_id` por frase).

### Tracking de promptId por frase

Cuando el hook crea un `PhraseState`, guarda la frase del catalogo (`phrase: AccentuationPhrase`)
con su `id` (UUID del catalogo). En `sendForEvaluation` ese `id` se pasa como `promptId` al
mapper `toPhraseEvaluation`, que lo agrega a la entidad de dominio. Al cierre, el mapper
`toSaveAccentuationSessionDto` los enumera en el array `phrases[]`.

## 5. Capa de infraestructura

### DTO

`AccentuationDtos.ts` define los contratos HTTP:

- `AccentuationPhraseDto`: `{ id, text, category }` — devuelto por `GET /accentuation/phrases`.
- `PhraseEvaluationDto`: respuesta del `/evaluate` (puntajes + `feedback` + `specific_errors`).
- `AccentuationPhraseEvaluationInputDto`: lo que el cliente envia en `phrases[]` al `saveSession`
  (`phrase_index`, `prompt_id`, 4 sub-scores).
- `AccentuationPhraseEvaluationOutputDto`: lo que devuelve `GET /sessions/{id}/phrases`
  (incluye `prompt_text` y `prompt_category` para renderizar sin un segundo round-trip).
- `AccentuationWeakestPromptDto`: lo que devuelve `GET /insights/weakest-prompts`.

### Mapper

`toPhraseEvaluation(dto, promptId)` convierte el DTO al tipo de dominio `PhraseEvaluation`
inyectando el `promptId` (no viene en la respuesta de Gemini, el hook lo conoce porque tiene
el catalogo).

`toSaveAccentuationSessionDto(result)` arma el payload de la sesion incluyendo el array
`phrases[]` con un objeto por frase evaluada.

### Repository

- `evaluatePhrase(audio, phrase_text, phrase_index)`: `POST /api/accentuation/evaluate`.
- `listPhrases()`: `GET /api/accentuation/phrases`.
- `saveSession(payload)`: `POST /api/accentuation/sessions` con `phrases[]`.
- `getSessionPhrases(id)`: `GET /api/accentuation/sessions/{id}/phrases`.
- `getWeakestPrompts(limit, minPracticeCount)`: `GET /api/accentuation/insights/weakest-prompts`.

## 6. Tipos de dominio

```typescript
interface AccentuationPhrase {
  id: string
  text: string
  category: 'declarative' | 'interrogative' | 'exclamative'
}

interface EvaluationMetrics {
  overallScore: number
  pronunciationScore: number
  rhythmScore: number
  intonationScore: number
  stressAccuracyScore: number
}

interface SpecificError {
  word: string
  wordIndex: number | null
  actualStressedSyllableIndex: number | null
  expectedStress: string
  actualIssue: string
  suggestion: string
}

interface PhraseEvaluation {
  phraseText: string
  phraseIndex: number
  promptId: string
  metrics: EvaluationMetrics
  feedback: string
  specificErrors: SpecificError[]
}

interface AccentuationSessionResult {
  metrics: EvaluationMetrics
  summaryFeedback: string
  phraseEvaluations: PhraseEvaluation[]
  timestamp: number
}
```

## 7. Pendientes

- **Pantalla de detalle de sesion historica**: el endpoint `GET /sessions/{id}/phrases` ya
  devuelve el desglose por frase pero no hay UI que lo consuma. Cuando se construya la lista
  de historial del modulo, esa pantalla debe renderizar el detalle.
- **Eliminacion de la copia local de `useAudioRecorder`**: pendiente de unificar con
  `shared/hooks/useAudioRecorder.ts` (preexistente al rollout actual).
