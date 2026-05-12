# Documentacion tecnica — OK Action Frontend

Este directorio contiene la documentacion tecnica de los modulos del frontend de OK Action.
Cada archivo describe la arquitectura, los componentes, los hooks y el flujo de datos de un modulo especifico.

## Modulos documentados

| Modulo | Archivo | Descripcion |
|--------|---------|-------------|
| Fonacion | [modulos/fonacion.md](modulos/fonacion.md) | Analisis en tiempo real de frecuencia y volumen de voz via Web Audio API |
| Pronunciacion | [modulos/pronunciacion.md](modulos/pronunciacion.md) | Grabacion y evaluacion de frases con feedback de Gemini por fonema |
| Acentuacion | [modulos/acentuacion.md](modulos/acentuacion.md) | Evaluacion de acento prosodico, entonacion y ritmo via Gemini |
| Volumen | [modulos/volumen.md](modulos/volumen.md) | Coach de volumen en tiempo real con calibracion de ruido y voz |
| Muletillas | [modulos/muletillas.md](modulos/muletillas.md) | Deteccion de palabras de relleno en respuestas orales via Gemini |
| Fluidez | [modulos/fluidez.md](modulos/fluidez.md) | Practica de continuidad oral con feedback en tiempo real |
| Consistencia | [modulos/consistencia.md](modulos/consistencia.md) | Evaluacion de estabilidad entre inicio, desarrollo y cierre |
| Perfil | [modulos/perfil.md](modulos/perfil.md) | Pantalla de usuario, historial de ejercicios y cápsulas en video |
| Expresion Corporal | [modulos/expresion-corporal.md](modulos/expresion-corporal.md) | Analisis de postura, gestos, apertura y estabilidad con MediaPipe Pose |

## Estructura general del frontend

El frontend sigue una arquitectura por features con separacion en capas:

```
src/features/<modulo>/
  domain/           tipos de dominio, entidades puras
  infrastructure/
    dto/            tipos que reflejan la forma exacta de la respuesta HTTP
    mappers/        conversion de DTO (snake_case) a tipo de dominio (camelCase)
    repositories/   llamadas HTTP al backend
  presentation/
    hooks/          logica de estado y ciclo de vida (useXxxSession)
    pages/          componente raiz de la ruta, orquesta vistas
    components/     atomos, moleculas y organismos visuales
```

Los modulos de Fonacion y Pronunciacion tienen una estructura ligeramente diferente porque se
implementaron antes de establecer la convencion de carpeta `presentation/`.

## Convenciones

- Los hooks de sesion (`useXxxSession`) son el unico punto de verdad del estado de un modulo.
- Los componentes de pagina no contienen logica de negocio: solo llaman al hook y distribuyen props.
- La conversion de datos del backend ocurre exclusivamente en los mappers; ningun componente accede
  directamente a los campos snake_case de los DTOs.
- El audio se captura siempre mediante `useAudioRecorder` (grabacion discreta) o `useVoiceMonitor`
  (analisis continuo en tiempo real con AudioWorklet).
- Las pantallas de altura completa usan `min-h-[100dvh]` o `h-[100dvh]`, no `min-h-screen`
  ni `h-screen`, para evitar cortes por las barras dinamicas de Safari/iOS.
