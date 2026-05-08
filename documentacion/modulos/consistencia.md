# Modulo de Consistencia - Frontend

## 1. Descripcion funcional

El modulo de Consistencia permite practicar una respuesta oral y recibir una evaluacion de estabilidad al terminar el intento. La pantalla se enfoca en comparar inicio, desarrollo y cierre segun ritmo, volumen, claridad, foco, seguridad y estructura.

La ruta principal es `/consistencia`.

## 2. Navegacion

El modulo se registra en:

- `src/app/router/AppRouter.tsx`
- `src/shared/ui/config/navItems.ts`
- `src/shared/ui/atoms/NavIcon.tsx`
- `src/features/dashboard/pages/DashboardPage.tsx`

El icono usado es `consistency`.

## 3. Estructura de archivos

```text
src/features/consistency/
  domain/ConsistencySession.ts
  presentation/components/ConsistencyFeedbackPanel.tsx
  presentation/hooks/useConsistencySession.ts
  presentation/pages/ConsistencyPage.tsx
  services/questions.ts
  index.ts
```

## 4. Hook principal

`useConsistencySession` concentra el estado del flujo:

- `idle`: seleccion de consigna.
- `connecting`: apertura de WebSocket.
- `recording`: captura PCM mediante `AudioCapture`.
- `analyzing`: captura detenida; el backend analiza el audio completo.
- `ended`: resultado final disponible.

El hook abre:

```text
ws://<host>/api/consistency/session?token=<JWT>
```

La base de WebSocket se obtiene desde `WS_BASE_URL` en `src/api/client.ts`, respetando `globalThis.__APP_WS_URL__`, `VITE_WS_URL` y fallback local.

## 5. Contrato de datos

El frontend espera el resultado definido en `ConsistencyAnalysis`:

```typescript
interface ConsistencyAnalysis {
  audio_intelligible: boolean
  score: number
  rhythm_consistency_score: number
  volume_consistency_score: number
  clarity_consistency_score: number
  focus_consistency_score: number
  confidence_consistency_score: number
  structure_consistency_score: number
  classification: string
  timeline: ConsistencyTimelineSegment[]
  volatility_events: ConsistencyVolatilityEvent[]
  strengths: string[]
  improvement_areas: string[]
  recommendation: string
  fb: string
}
```

No se muestra transcripcion. El modulo solo presenta observaciones por tramo y recomendaciones.

## 6. Componentes

### `ConsistencyPage`

Orquesta la consigna, estados de conexion/grabacion/analisis y resultado final.

### `ConsistencyFeedbackPanel`

Muestra:

- score y clasificacion;
- feedback y recomendacion;
- seis metricas de consistencia;
- timeline por tramo;
- cambios bruscos detectados;
- fortalezas y areas de mejora.

## 7. Integracion con Sesion Libre

Sesion libre incorpora la dimension `consistency` como opcion seleccionable. Si el usuario la marca, el backend devuelve `dims.consistency` en cada ciclo de analisis.

El frontend agrega soporte en:

- `LiveSession.ts`
- `liveDimLabels.ts`
- `DimensionSelector.tsx`
- `LiveFeedbackPanel.tsx`
- `SessionSummaryScreen.tsx`
- `CorrectionOverlay.tsx`

Si `consistency` no se selecciona, no altera el flujo existente de sesion libre.
