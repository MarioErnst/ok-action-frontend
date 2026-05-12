# Módulo de Dashboard

Pantalla inicial post-login (`/dashboard`). Reemplaza al antiguo "grid de módulos" — esa vista vive ahora en [`ejercicios.md`](ejercicios.md). El dashboard se enfoca **exclusivamente en mostrar progreso**: dos gráficos temporales con filtros por módulo y por rango.

Vive en `src/features/dashboard/presentation/`.

## Qué muestra

Tres bloques apilados verticalmente:

1. **Greeting** — nombre del usuario activo (leído desde `useAuthStore`) y subtítulo explicativo.
2. **Barra de filtros** — chips horizontales scrollables con los 12 módulos del `ModuleEnum` (más "Todos") y un selector segmentado de rango temporal (7d / 30d / 90d / Todo).
3. **Dos `ChartCard`** apiladas:
   - **Rendimiento**: `LineChart` con el `avg_score` diario.
   - **Tiempo diario**: `BarChart` con los minutos de práctica por día.

El filtro de módulo y el rango son **estado local** del page (`useState`). Cambiarlos dispara un refetch del hook `useProfileTimeline`.

## Estructura Atomic Design

```
frontend/src/features/dashboard/presentation/
├── components/
│   ├── atoms/
│   │   ├── ChartCard.tsx          ← contenedor con título, subtítulo y slot de acción
│   │   └── TimeRangePill.tsx      ← botón individual del selector de rango
│   ├── molecules/
│   │   ├── ModuleScrollChips.tsx  ← chips scrollables "Todos + 12 módulos"
│   │   └── TimeRangeSelector.tsx  ← grupo de 4 TimeRangePill
│   └── organisms/
│       ├── PerformanceChart.tsx   ← LineChart de Recharts
│       └── DailyTimeChart.tsx     ← BarChart de Recharts
└── pages/
    └── DashboardPage.tsx
```

## Integración con backend

| Endpoint | Hook | Tabla(s) backend |
|---|---|---|
| `GET /api/profile/timeline?range=...&module=...` | `useProfileTimeline` (en `features/profile/presentation/hooks`) | `sessions` |

Tipos en `features/profile/domain/Timeline.ts` (`TimeRange`, `ModuleSlug`, `TimelineModuleFilter`, `Timeline`, `TimelinePoint`). El mapeo a etiquetas en español está centralizado en `features/profile/domain/ModuleLabels.ts` (`MODULE_LABELS`, `MODULE_ORDER`, `FILTER_LABELS`) para que cualquier otro consumidor (legend, tooltip futuro, breadcrumbs) lea la misma copia.

El repositorio HTTP (`HttpProfileTimelineRepository`) usa `apiRequest` — no hace `fetch` directo. React Query cachea por `[range, module]` con `staleTime: 60s`.

## Librería de gráficos

**Recharts** (`recharts@^3.8.1`). Elegida por: ser el estándar React, declarativa, responsive nativa vía `<ResponsiveContainer>`, bundle gzip ~80KB. Se estiliza con CSS custom properties del tema (`var(--color-accent)`, `var(--color-surface)`, `var(--color-text-muted)`, etc.), no con colores hardcodeados.

## Responsive

- Móvil (`<sm`): los chips se vuelven scrollables horizontalmente con `-mx-4` para sangrar el padding y aprovechar el ancho completo. Los gráficos tienen `height: 220-260px`. La barra de filtros stackea (chips arriba, range selector debajo). Padding inferior `pb-24` para no chocar con la `AppBottomBar`.
- Tablet/Desktop (`md+` y `lg+`): los filtros van uno al lado del otro. Gráficos crecen a `280-320px`. Sin padding extra inferior.

## Estados

| Estado | Render |
|---|---|
| Loading inicial | Spinner en el área del gráfico (`LoadingState`). |
| Error | Mensaje "No pudimos cargar tus datos" (`ErrorState`). |
| Sin sesiones en el rango | `EmptyState` con ícono SVG + texto explicativo (cada chart lo maneja por su cuenta). |
| Refetch | Los datos previos se mantienen visibles (`staleTime` + React Query default). |

## Datos para demo

El usuario `Mario Jr` (`mario@okaction.cl` / `Demo1234!`) se genera vía el script backend `backend/scripts/seed_demo_user.py`. Inyecta 60 días de sesiones plausibles sobre los 12 módulos, con `linguistic_versatility` notablemente más bajo para mostrar contraste cuando se selecciona en los chips.

Ver `documentacion/scripts/seed_demo_user.md` (repo backend) para detalles.
