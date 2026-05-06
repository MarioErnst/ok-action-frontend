# Modulo de Fonacion — Frontend

## 1. Descripcion funcional

El modulo de Fonacion permite al usuario realizar ejercicios de voz guiados con retroalimentacion
visual en tiempo real. El sistema captura el audio del microfono, detecta la frecuencia fundamental
(tono) y el nivel de presion sonora (volumen en dBFS) frame a frame, y muestra indicadores
animados durante la sesion. Al finalizar, presenta graficas de los datos registrados por ejercicio.

No hay comunicacion con el backend durante la sesion: todo el analisis ocurre localmente en el
navegador mediante la Web Audio API y un AudioWorklet personalizado.

## 2. Flujo de usuario

1. El usuario accede a la pagina de Fonacion y ve el menu de seleccion de ejercicios.
2. Selecciona los ejercicios que desea practicar (o usa la seleccion predeterminada).
3. Inicia la sesion: el sistema calibra el ruido ambiental durante 3 segundos.
4. Para cada ejercicio aparece una cuenta regresiva de 3 segundos, luego la grabacion activa.
5. Al completar la duracion del ejercicio se avanza automaticamente al siguiente.
6. Al terminar todos los ejercicios se presenta la pantalla de resultados con los frames grabados.
7. El usuario puede reiniciar o volver al menu.

## 3. Arquitectura del modulo

```
src/features/phonation/
  hooks/
    useVoiceMonitor.ts        captura de audio continuo via AudioWorklet
    useEvaluationSession.ts   logica de sesion: fases, temporizadores, acumulacion de frames
  pages/
    EvaluationPage.tsx        orquestador de vistas: menu, evaluacion, resultados
  components/organisms/
    EvaluationMenu.tsx        seleccion de ejercicios
    EvaluationScreen.tsx      pantalla de grabacion activa con indicadores
    ResultsScreen.tsx         graficas de frecuencia y volumen por ejercicio
  services/
    exercises.ts              definicion estatica de los ejercicios disponibles
  types.ts                   PhonationFrame, VoiceExercise y tipos relacionados
```

## 4. Hook principal: useVoiceMonitor

Responsable de toda la captura de audio en tiempo real. Implementa el siguiente flujo:

1. Solicita acceso al microfono con `navigator.mediaDevices.getUserMedia`.
2. Crea un `AudioContext` y carga el worklet `/worklets/phonation.worklet.js`.
3. El worklet procesa bloques de audio y envia mensajes con `{ hz, db }` al hilo principal.
4. Durante los primeros `CALIBRATION_DURATION_MS` (3000 ms), acumula muestras de dB para
   calcular el piso de ruido (`noiseFloor`) y lo envia al worklet para que lo use como referencia.
5. Fuera de la calibracion, los mensajes se acumulan en refs (`pendingHzRef`, `pendingDbRef`,
   `pendingFramesRef`) y se vuelcan al estado de React cada `UI_UPDATE_INTERVAL_MS` (67 ms, ~15 fps)
   para evitar renders excesivos.
6. El buffer de frames se limita a `MAX_FRAMES` (100) descartando los mas antiguos.

Valores clave exportados: `hz`, `db`, `isCalibrating`, `noiseFloor`, `frames`, `start`, `stop`.

## 5. Hook de sesion: useEvaluationSession

Orquesta las fases de la sesion encima de `useVoiceMonitor`:

- **Fases**: `idle` → `countdown` → `recording` → (siguiente ejercicio) → `finished`.
- **Cuenta regresiva**: usa `setInterval` de 1 segundo; al llegar a 0 transiciona a `recording`.
- **Temporizador de grabacion**: tick cada `RECORDING_TICK_MS` (100 ms); cuando `elapsedMs`
  supera `exercise.durationMs` avanza al siguiente ejercicio o finaliza la sesion.
- **Acumulacion de frames**: en cada render con `phase === 'recording'`, filtra los frames nuevos
  (timestamp mayor al ultimo capturado) y los agrega al mapa `recordedResults[exerciseId]`.
- **Limpieza**: ambos intervals se cancelan en el cleanup de cada efecto y en el unmount.

## 6. Componente de pagina: EvaluationPage

Mantiene tres estados propios:
- `view`: `'menu' | 'evaluating' | 'results'`
- `recordedResults`: mapa `exerciseId → PhonationFrame[]`
- `selectedExercises`: lista de ejercicios elegidos en el menu

Renderiza condicionalmente `EvaluationMenu`, `EvaluationScreen` o `ResultsScreen` segun `view`.
No contiene logica de audio ni de temporizacion; todo eso vive en los hooks.

## 7. Tipos de dominio

```typescript
interface PhonationFrame {
  hz: number | null;  // frecuencia fundamental detectada; null si no hay voz
  db: number;         // nivel en dBFS (negativo, 0 es el maximo digital)
  timestamp: number;  // Date.now() en el momento de captura
}

interface VoiceExercise {
  id: string;
  name: string;
  durationMs: number;
  instruction: string;
}
```

## 8. Worklet de audio

Archivo: `public/worklets/phonation.worklet.js`

Procesa bloques de `Float32Array` del canal de entrada. Calcula:
- **dBFS**: `20 * log10(rms)` donde `rms` es la raiz cuadrada de la media de cuadrados.
- **Frecuencia fundamental**: mediante autocorrelacion sobre el buffer del periodo anterior.

Envia el resultado al hilo principal via `this.port.postMessage({ hz, db })` en cada bloque.
Acepta mensajes entrantes con `{ noiseFloor }` para ajustar el umbral de silencio.
