# Modulo de Sesion Libre — Frontend

## 1. Descripcion funcional

El modulo de Sesion Libre permite al usuario realizar una sesion de habla en tiempo real con
retroalimentacion continua del backend. El usuario elige las dimensiones de evaluacion (pronunciacion,
acentuacion, etc.), inicia la grabacion, y recibe analisis periodicos mientras habla. Si el backend
detecta un error relevante, interrumpe la sesion con una correccion especifica. La sesion termina
por iniciativa del usuario, por correccion del backend, o por timeout.

## 2. Navegacion

La pagina esta disponible en `/sesion-libre`. Aparece en la barra de navegacion lateral bajo el
nombre "Sesion Libre" con el icono de microfono (`live`).

## 3. Jerarquia de componentes

```
LiveSessionPage
  ├── DimensionSelector        (fase 'idle')
  │     └── DimensionToggle    (molecula: boton de seleccion de dimension)
  └── LiveRecordingScreen      (fases 'connecting' | 'recording' | 'correction' | 'ended')
        ├── LiveFeedbackPanel  (panel de metricas en tiempo real)
        └── CorrectionOverlay  (superposicion de correccion)
```

`LiveSessionPage` actua como orquestador: segun la fase de la sesion, renderiza
`DimensionSelector` o `LiveRecordingScreen`. No contiene logica propia; toda la logica
vive en el hook `useLiveSession`.

## 4. Hook principal: useLiveSession

### Maquina de estados (fases)

```typescript
type LiveSessionPhase = 'idle' | 'connecting' | 'recording' | 'correction' | 'ended'
```

- **idle**: estado inicial. El usuario selecciona dimensiones. `DimensionSelector` se muestra.
- **connecting**: se abre la conexion WebSocket y se envia el mensaje `start`. Se espera `ready`.
- **recording**: el backend confirmo con `ready`. La captura de audio comienza. `LiveRecordingScreen` se muestra.
- **correction**: el backend envio un mensaje `correction`. La captura se detiene. `CorrectionOverlay` se muestra sobre `LiveFeedbackPanel`.
- **ended**: el backend envio `session_ended` o el usuario presiono finalizar. La sesion termina.

### Dimension `lex` (versatilidad linguistica)

A diferencia de `pron`, `acc` y `mul` (analizadas cada 5 s) y `precision` (Q&A guiado), la dimension `lex` se evalua **al cierre de la sesion** sobre el audio acumulado completo. El backend envia un mensaje `lex_result` justo antes de `session_ended`. El hook `useLiveSession` lo expone como `lexResult: LexResult | null` y `SessionSummaryScreen` renderiza un panel especifico con el puntaje, el nivel de riqueza (basico/intermedio/avanzado) y el feedback de Gemini. No aparece en el panel en vivo durante la grabacion porque no hay datos parciales.

### Transiciones

```
idle → connecting   (startSession)
connecting → recording  (ws.onmessage: type === 'ready')
recording → correction  (ws.onmessage: type === 'correction')
recording → ended       (ws.onmessage: type === 'session_ended' | endSession)
correction → idle       (resetSession)
ended → idle            (resetSession)
connecting → idle       (ws.onerror | ws.onmessage: type === 'error')
```

## 5. Conexion WebSocket

La URL del WebSocket se resuelve en este orden de prioridad:

1. `globalThis.__APP_WS_URL__` (inyeccion en tiempo de ejecucion para entornos cloud)
2. `import.meta.env.VITE_WS_URL` (variable de entorno de Vite)
3. `ws://<host-actual>/api` (fallback para desarrollo local)

Al conectar, el cliente envia `{ type: 'start', dims: selectedDims }` en el evento `onopen`.
El servidor responde con `{ type: 'ready' }` cuando esta preparado para recibir audio.

Mensajes del servidor reconocidos:

| type            | accion en el cliente                                      |
|-----------------|-----------------------------------------------------------|
| `ready`         | inicia `AudioCapture` y el temporizador de sesion         |
| `analysis`      | actualiza `latestAnalysis` y acumula en `analyses`        |
| `correction`    | detiene captura, guarda `CorrectionEvent`, fase → correction |
| `session_ended` | detiene captura, guarda `stopReason`, fase → ended        |
| `error`         | detiene captura, fase → idle                              |

El cliente puede enviar `{ type: 'end' }` al servidor para finalizar la sesion voluntariamente.

## 6. Captura de audio: AudioCapture con Web Audio API

La clase `AudioCapture` usa la Web Audio API (`AudioContext` + `ScriptProcessorNode`) en lugar
de `MediaRecorder` por los siguientes motivos:

- `MediaRecorder` produce contenedores de audio (WebM/Opus) con cabeceras de formato variable
  que complican el parsing en el backend a medida que llegan fragmentos.
- La Web Audio API permite acceder directamente a los samples PCM de 32 bits en punto flotante
  tal como salen del microfono, sin codec ni empaquetamiento.
- El backend de Gemini Live espera PCM crudo (`audio/pcm`), lo que hace que la transmision
  directa de floats sea mas eficiente y predecible.
- `ScriptProcessorNode` opera con buffers de tamano fijo (4096 samples por defecto), lo que
  produce chunks de tamano uniforme y facilita el control de flujo en el WebSocket.

El audio se convierte de Float32 a Int16 antes de enviarse por el WebSocket para reducir el
ancho de banda a la mitad manteniendo la precision suficiente para el reconocimiento de voz.

## 7. Comportamiento responsive

- En movil (< md): `CorrectionOverlay` aparece como un panel deslizable desde la parte
  inferior de la pantalla (bottom sheet). Ocupa el ancho completo de la pantalla.
- En tablet y escritorio (>= md): `CorrectionOverlay` aparece centrado sobre el contenido
  como un dialogo modal con ancho maximo controlado.
- `DimensionSelector` y `LiveFeedbackPanel` usan grillas de Tailwind que se adaptan al
  numero de columnas segun el ancho disponible.

## 8. Integracion con el resto del sistema

- El modulo es independiente de los demas modulos de evaluacion (fonacion, pronunciacion, etc.).
  No comparte estado ni repositorios con ellos.
- El token de autenticacion se lee de `localStorage` bajo la clave `auth_token`, consistente
  con el cliente HTTP del resto de la aplicacion (`api/client.ts`).
- La ruta `/sesion-libre` esta protegida por `ProtectedRoute` al igual que las demas rutas
  de la aplicacion. Si el usuario no esta autenticado, se redirige a `/auth`.
- El icono `live` fue agregado al componente `NavIcon` como una entrada en el objeto `PATHS`
  con la misma estructura SVG que los demas iconos. El tipo `NavIconName` fue extendido para
  incluir `'live'` antes de actualizar `navItems.ts`, garantizando que TypeScript valide
  la consistencia del sistema de navegacion.

## 9. Decisiones de diseno

### Por que la pagina delega todo al hook

`LiveSessionPage` no tiene estado propio. Toda la logica de ciclo de vida (WebSocket, AudioCapture,
temporizador) vive en `useLiveSession`. Esto permite testear la logica de sesion sin necesidad
de montar el arbol de componentes completo.

### Por que no hay capa de repositorio HTTP

La sesion libre usa WebSocket, no HTTP. No hay un `HttpLiveSessionRepository` porque el protocolo
de comunicacion es distinto al de los otros modulos. La logica de WebSocket vive directamente en
el hook porque es parte del ciclo de vida de la sesion, no una operacion de datos desacoplada.

### Por que se acumulan analisis en un array

El hook mantiene tanto `latestAnalysis` (el ultimo resultado) como `analyses` (todos los resultados
acumulados). `LiveFeedbackPanel` usa `latestAnalysis` para mostrar metricas en tiempo real.
`analyses` esta disponible para un posible resumen al finalizar la sesion sin necesidad de
hacer una llamada adicional al backend.
