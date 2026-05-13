# Visualización de grabación en vivo

Pieza transversal usada por casi todos los módulos que capturan audio. Convierte la grabación de "un círculo rojo y un timer" en un waveform animado que reacciona a la voz del usuario en tiempo real.

## Componentes

```
shared/
├── ui/
│   ├── atoms/
│   │   └── WaveformBars.tsx         ← canvas + RAF, recibe AnalyserNode
│   └── molecules/
│       └── RecordingWaveform.tsx    ← orquesta el AnalyserNode + atom
└── hooks/
    ├── useAudioRecorder.ts          ← expone `activeStream` (MediaStream)
    └── useAnalyserNode.ts           ← deriva AnalyserNode desde un stream
```

### `WaveformBars` (atom)
Canvas de 32 barras por defecto. Lee del `AnalyserNode` con `getByteFrequencyData`, mapea las primeras N celdas (las que cubren el rango de voz humano, ~0-6 kHz) a alturas, aplica smoothing exponencial (`EMA factor = 0.55`) para que no se entrecorte, y dibuja con `requestAnimationFrame` capado a 30fps (cumple la regla del CLAUDE.md sobre presupuesto de animación en móvil).

Props relevantes:
- `analyser: AnalyserNode | null` — fuente de datos. Si es `null` o `active=false`, dibuja un idle state.
- `active: boolean` — pausa el RAF cuando no se está grabando (ahorra CPU/batería).
- `bars`, `height`, `color`, `inactiveColor` — visual tuneables, defaults usan tokens del tema.

### `RecordingWaveform` (molecule)
Acepta **uno de dos**:
- `analyser`: para módulos que ya manejan su propio `AudioContext` (phonation/loudness/pauses vía `useVoiceMonitor`).
- `stream`: para módulos que solo tienen un `MediaStream` (resto de los módulos vía `useAudioRecorder`); internamente usa `useAnalyserNode` para derivar el analyser.

Esta separación evita que un módulo abra dos `AudioContext` distintos para el mismo micrófono.

### `useAnalyserNode` (shared hook)
Toma un `MediaStream` y devuelve un `AnalyserNode` con su ciclo de vida (creación de `AudioContext`, conexión de source, cleanup al unmount). Intencionalmente **no conecta el analyser al `destination`** para que el usuario no escuche eco de su propia voz.

## Módulos integrados

| Módulo | Audio source | Cómo recibe el waveform |
|---|---|---|
| Muletillas | `useAudioRecorder` (shared) | `<RecordingWaveform stream={activeStream} active={isRecording} />` |
| Acentuación | `useAudioRecorder` (shared, re-exportado) | idem |
| Pronunciación | `useAudioRecorder` (shared) | idem |
| Precisión | `useAudioRecorder` (shared) | idem |
| Versatilidad lingüística | `AudioRecorder` class (custom service) | Service extendido con `getStream()`, hook expone `activeStream` |
| Sesión libre | `useAudioRecorder` (shared) | idem muletillas |
| Fonación | `useVoiceMonitor` (own `AudioContext` + worklet) | `<RecordingWaveform analyser={session.analyser} active={isRecording} />` — el hook crea un `AnalyserNode` paralelo desde la misma `MediaStreamAudioSourceNode` que el worklet |
| Pausas | `useVoiceMonitor` (compartido con fonación) | idem fonación |

## Módulo NO integrado: Volumen

El módulo de Volumen ya tiene un coach visual (`LoudnessCoachPanel`) con barras de dB por banda y mensaje contextual en tiempo real. Agregar un `RecordingWaveform` arriba sería visualmente redundante — el meter de Volumen es el equivalente para ese módulo. Decisión consciente, no oversight.

## Decisiones de diseño

- **Frequency data, no time-domain**: las barras leen `getByteFrequencyData` (no `getByteTimeDomainData`). Frequency data se ve más viva con voz (las barras pulsean con energía espectral), mientras que time-domain produce una onda más estática salvo a volúmenes altos.
- **32 barras**: balance entre detalle visual y costo de RAF. Más barras no mejoran perceptiblemente.
- **Smoothing EMA 0.55**: factor empírico. <0.4 hace que las barras vibren feo; >0.7 las hace lentas y mueve poco la cara.
- **Bucket de las primeras 32 celdas FFT**: a `fftSize=256` y 48 kHz sample rate, cubre 0-6 kHz, que es el rango de voz humana. Las altas frecuencias (siseo, ruido ambiente) se descartan.

## Cómo agregar el waveform a un módulo nuevo

1. Si el módulo usa `useAudioRecorder` (shared):
   - Destructurar `activeStream` del hook.
   - Pasar a la pantalla de grabación.
   - Renderizar `<RecordingWaveform stream={activeStream} active={isRecording} />`.

2. Si el módulo tiene su propio `AudioContext`:
   - Crear un `AnalyserNode` desde la misma source.
   - Exponer en el hook como `analyser: AnalyserNode | null`.
   - Renderizar `<RecordingWaveform analyser={analyser} active={...} />`.

3. Si el módulo usa `MediaRecorder` directo sin hook:
   - Capturar el stream en estado/ref.
   - Renderizar `<RecordingWaveform stream={stream} active={...} />` (la molecule crea el analyser internamente).

## CLAUDE.md compliance

- 30fps cap en RAF (regla móvil).
- Tokens del tema (`--color-accent`, `--color-text-muted`) — no colores hardcoded.
- Cleanup en unmount (no leak de `AudioContext`).
- Sin emojis en código. Comentarios en inglés.
- Sin Web Speech API. Solo Web Audio API.
- Responsive: el canvas usa `width: 100%` con devicePixelRatio para retina.
