# Modulo de Volumen (Loudness Coach) — Frontend

## 1. Descripcion funcional

El modulo de Volumen provee al usuario retroalimentacion en tiempo real sobre su nivel de volumen
vocal. Clasifica el audio captado por el microfono en cinco bandas (silencio, muy bajo, optimo,
muy alto, saturacion) y muestra mensajes de coaching en funcion de la banda actual. Registra
metricas de sesion: tiempo total, tiempo por banda y porcentaje de tiempo en rango optimo.

El analisis es completamente local: no se envia audio al backend. Los presets de umbrales se
cargan desde el backend al iniciar la pagina; si la carga falla, se usan presets locales.

## 2. Flujo de usuario

1. El usuario elige un preset de contexto (por ejemplo: presentacion, clase, conversacion).
2. El sistema inicializa el microfono y realiza dos calibraciones en secuencia:
   - **Ruido ambiental** (`noise`): 3 segundos en silencio para medir el piso de ruido.
   - **Voz de referencia** (`voice`): el usuario habla en su volumen habitual.
3. Con ambas calibraciones completas, el coach muestra en tiempo real la banda actual y metricas.
4. El usuario puede detener la sesion en cualquier momento.
5. Al detener, las metricas finales permanecen visibles.

## 3. Arquitectura del modulo

```
src/features/loudness/
  hooks/
    useLoudnessCoach.ts         hook principal: clasificacion, debounce y metricas
    useVoiceBaseline.ts         calibracion de la voz de referencia del usuario
  pages/
    LoudnessCoachPage.tsx       carga presets, seleccion, monta el panel de coaching
  components/organisms/
    LoudnessCoachPanel.tsx      panel principal con medidor, mensajes y metricas
    PresetSelector.tsx          pantalla de seleccion de preset antes de iniciar sesion
  components/molecules/
    LoudnessMeter.tsx           visualizacion del nivel de dB en tiempo real
    CoachMessage.tsx            mensaje contextual segun la banda actual
    SessionMetrics.tsx          estadisticas de la sesion activa
  services/
    loudnessClassifier.ts       funcion pura que clasifica dB en banda
    loudnessEffectiveConfig.ts  calcula umbrales absolutos a partir de preset + baseline
    loudnessPresets.ts          presets locales de fallback
    loudnessFormatters.ts       formatos legibles para la UI (tiempo, porcentaje, dB)
  infrastructure/
    dto/LoudnessDtos.ts
    mappers/loudnessMapper.ts
    repositories/HttpLoudnessRepository.ts
  types.ts
```

## 4. Hook principal: useLoudnessCoach

### Dependencias

Internamente usa:
- `useVoiceMonitor` (del modulo de Fonacion): captura continua de audio con AudioWorklet.
- `useVoiceBaseline`: calibra la voz de referencia despues de que `useVoiceMonitor` completa
  la calibracion de ruido.

### Configuracion efectiva

`computeEffectiveConfig(preset, voiceBaseline)` transforma los offsets relativos del preset
en umbrales absolutos en dBFS usando la medicion de voz de referencia como ancla.
El resultado es un `LoudnessConfig` con: `silenceOffsetDb`, `tooLowCeilingDbfs`,
`optimalCeilingDbfs`, `clipThresholdDbfs`.

### Clasificacion con debounce

Para evitar que la banda cambie rapidamente ante fluctuaciones momentaneas, se aplica un
debounce de `BAND_DEBOUNCE_MS` (400 ms). Ademas, para transicionar a una nueva banda es
necesario estar suficientemente dentro de ella (`HYSTERESIS_MARGIN_DB` = 2 dB) segun la funcion
`isDeepEnoughInBand`. Esto evita oscilaciones en los limites entre bandas.

### Acumulacion de metricas

Las metricas se acumulan frame a frame en un `ref` (sin pasar por `setState` en cada frame)
para evitar renders innecesarios. Solo se sincronizan al estado con `setMetrics` cuando llegan
nuevos frames. El tiempo por banda se calcula como el delta entre timestamps consecutivos.

Los frames anteriores a la finalizacion de la calibracion de voz se descartan usando un
timestamp de anclaje (`pendingActiveFrameTimestampRef`) establecido en el primer render con
`effectiveConfig !== null`.

### Fases de calibracion

```typescript
type CalibrationPhase = 'idle' | 'noise' | 'voice' | 'active'
```

- `idle`: el microfono no esta activo.
- `noise`: `useVoiceMonitor` esta calibrando el ruido ambiental.
- `voice`: `useVoiceBaseline` esta midiendo la voz de referencia.
- `active`: calibracion completa, el coach esta en funcionamiento.

## 5. Hook de calibracion: useVoiceBaseline

Mide el nivel medio de la voz del usuario despues de que la calibracion de ruido termina.
Acumula muestras de dB de los frames recibidos durante un periodo fijo y calcula la media.
El resultado (`voiceBaseline`) se pasa a `computeEffectiveConfig` para obtener umbrales absolutos.

## 6. Clasificacion de bandas

`classifyLoudness(db, noiseFloor, config)` en `services/loudnessClassifier.ts`:

| Banda | Condicion |
|-------|-----------|
| `silence` | `db < noiseFloor + config.silenceOffsetDb` |
| `too-low` | `db >= silencio` y `db < config.tooLowCeilingDbfs` |
| `optimal` | `db >= tooLow` y `db < config.optimalCeilingDbfs` |
| `too-high` | `db >= optimal` y `db < config.clipThresholdDbfs` |
| `clipping` | `db >= config.clipThresholdDbfs` |

## 7. Presets y backend

Los presets definen offsets relativos (en dB) que se suman a la voz de referencia del usuario.
El backend sirve presets personalizados del usuario; si no hay conexion o no hay presets del
usuario, se usan los presets locales de `services/loudnessPresets.ts`.

`LoudnessCoachPage` carga los presets con `HttpLoudnessRepository.listPresets()` al montar.
Si la llamada falla, mantiene los presets locales sin mostrar error bloqueante al usuario.

La pantalla de seleccion de preset esta encapsulada en el organism `PresetSelector`, que recibe
`presets: LoudnessPreset[]` y `onSelect(preset: LoudnessPreset): void`. La pagina mantiene el
estado `selectedPreset` y lo pasa a `useLoudnessCoach`; `PresetSelector` no conoce ese estado.

### Persistencia del piso de ruido

Cuando una sesion termina, `useLoudnessCoach` invoca `toSaveLoudnessSessionDto(metrics,
presetId, noiseFloor)` y envia el resultado al backend con `HttpLoudnessRepository.saveSession`.
El `noiseFloor` medido por `useVoiceMonitor` durante la fase `noise` de la calibracion se
serializa como `noise_floor_db` (NULL si la calibracion no termino o devolvio `-Infinity`),
correspondiendo a la columna `loudness_metrics.noise_floor_db` introducida por la migracion
0008. Esto permite que el backend compare sesiones del mismo usuario entre distintos
microfonos/entornos sin perder informacion del piso de ruido especifico de cada sesion.

## 8. Tipos de dominio

```typescript
type LoudnessBand = 'silence' | 'too-low' | 'optimal' | 'too-high' | 'clipping'
type CalibrationPhase = 'idle' | 'noise' | 'voice' | 'active'

interface LoudnessPreset {
  presetId: string
  label: string
  description: string
  tooLowOffsetDb: number
  optimalOffsetDb: number
  isDefault: boolean
}

interface LoudnessConfig {
  silenceOffsetDb: number
  tooLowCeilingDbfs: number
  optimalCeilingDbfs: number
  clipThresholdDbfs: number
}

interface LoudnessMetrics {
  durationMs: number
  bandTimeMs: Record<LoudnessBand, number>
  optimalPercent: number
  peakDb: number
}
```
