# Modulo de Pronunciacion — Frontend

## 1. Descripcion funcional

El modulo de Pronunciacion guia al usuario en la lectura en voz alta de frases calibradas por
nivel de dificultad. Para cada frase, el usuario graba su voz; el audio se envia al backend, que
lo evalua con Gemini y devuelve puntajes de vocales, consonantes, fluidez e inteligibilidad junto
con errores foneticos especificos. Al finalizar todas las frases, se presenta un resumen agregado.

## 2. Flujo de usuario

1. El usuario elige un nivel de dificultad: basico, intermedio o avanzado.
2. El sistema carga las frases correspondientes y comienza la grabacion de la primera.
3. Para cada frase: el usuario lee en voz alta y presiona "Terminar" (o espera el limite).
4. El audio de cada frase se envia al backend de forma independiente; la evaluacion es asincrona.
5. Al completar la ultima frase, la pagina espera a que lleguen todas las evaluaciones pendientes.
6. Se presenta la pantalla de resultados con metricas agregadas y detalle por frase.
7. El usuario puede reiniciar la sesion.

## 3. Arquitectura del modulo

```
src/features/pronunciation/
  hooks/
    usePronunciationSession.ts   logica de sesion: fases, grabacion, envio y agregacion
  pages/
    PronunciationPage.tsx        orquestador de vistas
  components/organisms/
    LevelSelectionScreen.tsx     seleccion de nivel
    RecordingScreen.tsx          grabacion activa con indicador por frase
    PronunciationResultsScreen.tsx  resultados agregados y por frase
  infrastructure/
    dto/PronunciationDtos.ts     tipos que reflejan la respuesta HTTP del backend
    mappers/pronunciationMapper.ts  conversion DTO → tipos de dominio
    repositories/HttpPronunciationRepository.ts  llamadas HTTP
  services/
    phrases.ts                   frases estaticas organizadas por nivel
  types.ts                      PronunciationLevel, PhraseState, PhrasePronunciation, etc.
```

## 4. Hook principal: usePronunciationSession

### Fases de la sesion

`idle` → `recording` → `processing` → `finished`

- **idle**: estado inicial, esperando seleccion de nivel.
- **recording**: el usuario graba frase a frase; cada `finishCurrentPhrase` detiene la grabacion
  actual, envia el audio al backend de forma no bloqueante y, si hay mas frases, inicia la siguiente.
- **processing**: todas las frases fueron grabadas; se espera a que `pendingEvaluationCount` llegue a 0.
- **finished**: resultado disponible en `sessionResultRef.current`.

### Grabacion de audio

Utiliza el hook compartido `useAudioRecorder` (`shared/hooks/useAudioRecorder.ts`).
Cada llamada a `startRecording` abre una nueva sesion de `MediaRecorder`; `stopRecording` devuelve
un `Blob` con el audio completo de esa frase.

### Envio y evaluacion asincrona

`sendForEvaluation` llama a `HttpPronunciationRepository.evaluatePhrase` y actualiza el estado
de la frase individualmente (uploading → evaluated | error). Un contador `pendingEvaluationCount`
rastrrea cuantas evaluaciones estan en vuelo; cuando llega a 0 en fase `processing`, se calcula
el resultado y se transiciona a `finished`.

### Resultado agregado

`buildSessionResult` promedia los puntajes de todas las frases evaluadas satisfactoriamente
usando `averagePronunciationMetrics`. El feedback textual de resumen se determina por umbral:
puntaje general >= 70 produce un mensaje positivo, menor genera un mensaje de mejora.

## 5. Capa de infraestructura

### DTO

`PronunciationDtos.ts` define los tipos en snake_case que refleja la respuesta del backend:
`overall_score`, `vowel_score`, `consonant_score`, `fluency_score`, `intelligibility_score`,
`phoneme_errors` (array con `phoneme`, `word`, `actual_issue`, `suggestion`).

### Mapper

`toPhrasePronunciation` convierte el DTO al tipo de dominio `PhrasePronunciation`:
- Renombra campos a camelCase.
- Mapea el array `phoneme_errors` a `PhonemeError[]`.

`averagePronunciationMetrics` calcula el promedio de metricas sobre un array de `PhrasePronunciation`.

### Repository

`HttpPronunciationRepository.evaluatePhrase` serializa el audio como `FormData` con los campos
`audio` (Blob), `phrase_text` (string), `phrase_index` (number) y `level` (string).
Hace `POST /api/pronunciation/evaluate` y devuelve el DTO deserializado.

## 6. Niveles de dificultad

Definidos estaticamente en `services/phrases.ts`. Cada nivel tiene un conjunto de frases con
distintos patrones foneticos:

- **basico**: frases cortas con fonemas de alta frecuencia.
- **intermedio**: frases con combinaciones consonanticas mas complejas.
- **avanzado**: frases con vibrantes multiples, grupos consononticos y entonacion variada.

## 7. Tipos de dominio

```typescript
type PronunciationLevel = 'basico' | 'intermedio' | 'avanzado'

interface PhraseState {
  phrase: { text: string; phonetic_focus?: string }
  status: 'pending' | 'recording' | 'uploading' | 'evaluated' | 'error'
  evaluation: PhrasePronunciation | null
}

interface PhrasePronunciation {
  overallScore: number
  vowelScore: number
  consonantScore: number
  fluencyScore: number
  intelligibilityScore: number
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
