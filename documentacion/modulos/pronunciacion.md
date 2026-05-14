# Modulo de Pronunciacion — Frontend

## 1. Descripcion funcional

El modulo de Pronunciacion evalua la articulacion fonetica del usuario al leer frases en voz
alta. Cada nivel (basico, intermedio, avanzado) tiene un conjunto distinto de frases con
patrones foneticos crecientes. Las frases se obtienen del catalogo del backend
(`GET /pronunciation/phrases?level=...`) en lugar de una lista hardcoded. El backend evalua
cada frase con Gemini y devuelve los 4 sub-scores (vowel, consonant, fluency, intelligibility).

## 2. Flujo de usuario

1. El usuario accede a la pagina de Pronunciacion. Estado `idle`: ve la pantalla de seleccion
   de nivel y, si tiene historial suficiente, la tarjeta "Tus frases más difíciles".
2. Selecciona un nivel: el hook pasa a `loading` y trae las frases del catalogo.
3. Si la carga falla o el catalogo esta vacio, vuelve a `idle` y muestra un mensaje.
4. Si carga OK, pasa a `recording`. El usuario graba frase a frase, presionando "Siguiente"
   para enviar el audio y avanzar.
5. Los audios se envian asincronamente al backend; un contador trackea las pendientes.
6. Al terminar todas las frases entra en `processing` hasta que el contador llega a 0.
7. Se muestra la pantalla de resultados (`finished`). La sesion se persiste automaticamente
   con `POST /pronunciation/sessions` incluyendo el desglose por frase (`phrase_index`,
   `prompt_id`, 4 sub-scores), lo que alimenta el endpoint de insights.

## 3. Arquitectura del modulo

```
src/features/pronunciation/
  domain/
    PronunciationSession.ts                tipos del dominio (incluye promptId en
                                           PhrasePronunciation)
  infrastructure/
    dto/PronunciationDtos.ts               DTOs (incluye PronunciationPhraseDto,
                                           *PhraseEvaluationInputDto/OutputDto,
                                           *WeakestPromptDto)
    mappers/pronunciationMapper.ts         conversion DTO ↔ dominio; arma phrases[] en save
    repositories/HttpPronunciationRepository.ts  llamadas HTTP
  presentation/
    hooks/
      usePronunciationSession.ts           logica de sesion: fetch por nivel, fases,
                                           grabacion, envio y agregacion
      useWeakestPronunciationPrompts.ts    carga frases mas debiles (loading/ready/error)
    pages/
      PronunciationPage.tsx                orquestador con manejo de fase `loading`
    components/
      molecules/
        PhraseCard.tsx                     card de cada frase en la lista
        WeakestPhrasesCard.tsx             tarjeta "Tus frases más difíciles" (puro render)
      organisms/
        LevelSelectionScreen.tsx           seleccion de nivel + WeakestPhrasesCard montado
        RecordingScreen.tsx                grabacion activa
        PronunciationResultsScreen.tsx     resultados agregados y por frase
```

## 4. Hook principal: usePronunciationSession

### Fases de la sesion

`idle` → `loading` → `recording` → `processing` → `finished`

- **idle**: pantalla de seleccion de nivel.
- **loading**: tras pulsar un nivel, el hook hace fetch de las frases del catalogo. Si falla,
  vuelve a `idle` con `catalogError` poblado.
- **recording**: el usuario graba frase a frase.
- **processing**: todas las frases enviadas; espera a `pendingEvaluationCount === 0`.
- **finished**: resultado disponible.

### Catalog fetch por nivel

`startSession(level)` llama a `HttpPronunciationRepository.listPhrases(level)` antes de pasar
a `recording`. Las frases del catalogo entran al estado del hook (`phrases: PronunciationPhrase[]`)
y de ahi se construyen los `PhraseState`. El `id` UUID del catalogo se preserva como `phrase.id`
y luego se envia como `prompt_id` en el save.

### Tracking de promptId por frase

Cuando `sendForEvaluation` envia el audio al `/evaluate`, pasa `currentPhrase.id` como
`promptId` al mapper `toPhrasePronunciation(dto, promptId)`. El promptId queda en la entidad
de dominio y `toSavePronunciationSessionDto` lo enumera en el array `phrases[]`.

### Grabacion de audio

Utiliza el hook compartido `useAudioRecorder` (`shared/hooks/useAudioRecorder.ts`).

## 5. Capa de infraestructura

### DTO

`PronunciationDtos.ts` define:

- `PronunciationPhraseDto`: `{ id, text, difficulty }` — devuelto por
  `GET /pronunciation/phrases?level=`.
- `PhraseEvaluationDto`: respuesta del `/evaluate`.
- `PronunciationPhraseEvaluationInputDto`: lo que se envia en `phrases[]` al save.
- `PronunciationPhraseEvaluationOutputDto`: lo que devuelve `GET /sessions/{id}/phrases`.
- `PronunciationWeakestPromptDto`: respuesta de `/insights/weakest-prompts`.

### Mapper

`toPhrasePronunciation(dto, promptId)` inyecta `promptId` en la entidad de dominio.
`toSavePronunciationSessionDto(result)` arma el payload con `phrases[]`.

### Repository

- `evaluatePhrase(audio, phrase_text, phrase_index, level)`: `POST /api/pronunciation/evaluate`.
- `listPhrases(level)`: `GET /api/pronunciation/phrases?level=...`.
- `saveSession(payload)`: `POST /api/pronunciation/sessions` con `phrases[]`.
- `getSessionPhrases(id)`: `GET /api/pronunciation/sessions/{id}/phrases`.
- `getWeakestPrompts(limit, minPracticeCount, level?)`: `GET /api/pronunciation/insights/weakest-prompts`.

## 6. Niveles de dificultad

El backend siembra 6 frases por nivel en la tabla `prompts` (campo `difficulty`):

- **basico**: frases cortas con fonemas de alta frecuencia.
- **intermedio**: combinaciones consonanticas mas complejas.
- **avanzado**: vibrantes multiples, grupos consonanticos densos.

El frontend no decide que frases corresponden a cada nivel — solo pide al backend filtrando
por `?level=`.

## 7. Tipos de dominio

```typescript
type PronunciationLevel = 'basico' | 'intermedio' | 'avanzado'

interface PronunciationPhrase {
  id: string
  text: string
  level: PronunciationLevel
}

interface PhrasePronunciation {
  phraseText: string
  phraseIndex: number
  promptId: string
  metrics: PronunciationMetrics
  feedback: string
  phonemeErrors: PhonemeError[]
}

interface PronunciationSessionResult {
  level: PronunciationLevel
  metrics: PronunciationMetrics
  summaryFeedback: string
  phraseEvaluations: PhrasePronunciation[]
  timestamp: number
}
```

## 8. Pendientes

- **Pantalla de detalle de sesion historica**: el endpoint `GET /sessions/{id}/phrases` ya
  existe; cuando se construya el historial del modulo en el frontend, esa pantalla debe
  renderizar el desglose por frase.
