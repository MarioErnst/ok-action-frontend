# Módulo de Bienvenida

Pantalla efímera post-login (`/bienvenida`) que muestra el "estado actual" del usuario en un gráfico radar (también llamado araña) con un eje por módulo entrenable. Aparece **una sola vez por login** y no se puede volver a ella una vez que el usuario presiona "Continuar".

Vive en `src/features/welcome/`.

## Qué muestra

Una sola vista a pantalla completa (sin sidebar ni topbar), compuesta verticalmente:

1. **Wordmark** "OK ACTION" arriba, mismo tratamiento visual que la pantalla de login.
2. **Eyebrow** ámbar uppercase tracking-wider: "Estado actual".
3. **Título grande**: "Hola, [primer nombre del usuario]".
4. **Subtítulo**: "Este es tu estado actual sobre 100. Cada eje es un módulo de entrenamiento."
5. **Gráfico radar** con 10 ejes, dominio fijo 0..100.
6. **Botón "Continuar"** que navega a `/dashboard` con `replace: true` (sin opción de retroceso).

## Por qué existe

Da un "momento de orientación" al usuario apenas inicia sesión: ve de un vistazo en qué dimensiones está fuerte y en cuáles débil, antes de entrar a la navegación normal. Es deliberadamente no persistente: si el usuario quisiera volver a verla tendría que cerrar sesión y volver a entrar.

## Cuándo aparece (gate)

- Sólo después de un **login exitoso** en `LoginForm`.
- Implementado vía un store efímero (`welcomeStore`, zustand sin persistencia): el login llama `arm()`, el `WelcomePage` chequea ese flag al montar, y "Continuar" llama `disarm()`.
- **No persiste**: ni `localStorage` ni `sessionStorage`. Si el usuario cierra el tab y vuelve, no aparece (no es un "tour", es un "saludo de entrada").
- Entrar por URL directa a `/bienvenida` con `armed === false` redirige a `/dashboard` con `<Navigate replace />`.
- `authStore.logout()` también limpia el flag por defensa.

## Estructura Atomic Design

```
frontend/src/features/welcome/
├── domain/
│   └── InitialScores.ts                  ← tipo RadarDimension + constante INITIAL_SCORES (10 ejes)
├── presentation/
│   ├── store/welcomeStore.ts             ← zustand { armed, arm, disarm }
│   ├── components/
│   │   ├── molecules/WelcomeHeading.tsx  ← eyebrow + título + subtítulo
│   │   └── organisms/InitialRadar.tsx    ← recharts RadarChart con animación de entrada
│   └── pages/WelcomePage.tsx             ← layout full-screen + guard + acción continuar
└── index.ts                              ← reexporta WelcomePage y welcomeStore
```

Ningún componente del módulo Welcome se reutiliza desde fuera: es un punto de entrada único.

## Datos hardcodeados

La feature no hace fetch al backend. Los scores vienen de una constante en `InitialScores.ts`. Los valores fueron extraídos por consulta directa a la base `ok_action_dev` (Cloud SQL) tomando el `score` de la **primera sesión completada** por módulo del usuario demo `mario@okaction.cl`:

```sql
WITH ranked AS (
  SELECT s.module::text AS module, s.score,
         ROW_NUMBER() OVER (PARTITION BY s.module ORDER BY s.started_at ASC) AS rn
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE u.email = 'mario@okaction.cl'
    AND s.status = 'completed'
    AND s.score IS NOT NULL
)
SELECT module, score FROM ranked WHERE rn = 1 ORDER BY module;
```

| Eje | Módulo (`ModuleEnum`) | Label corto | Score |
|---|---|---|---|
| 1 | `phonation` | Fonación | 39 |
| 2 | `loudness` | Volumen | 49 |
| 3 | `accentuation` | Acentuación | 50 |
| 4 | `pronunciation` | Pronunciación | 61 |
| 5 | `muletillas` | Muletillas | 64 |
| 6 | `pauses` | Pausas | 58 |
| 7 | `fluency` | Fluidez | 55 |
| 8 | `precision` | Precisión | 58 |
| 9 | `linguistic_versatility` | Versatilidad | 46 |
| 10 | `facial_expression` | Expr. facial | 58 |

### Módulos excluidos del radar

- **`live`**: es una sesión compuesta, su score se hereda de los hijos. Incluirla distorsionaría el radar.
- **`consistency`**: métrica derivada que se calcula sobre el comportamiento de las otras dimensiones. No es una "skill atómica".
- **`body_expression`**: existe en la base de datos pero no representa una dimensión vocal/expresiva canónica del producto; se excluyó deliberadamente para mantener el radar enfocado en las 10 dimensiones acordadas.

Si más adelante el equipo decide consumir scores reales del backend (vía un endpoint nuevo del módulo profile), reemplazar la constante por el resultado del hook respectivo y mantener la misma forma del tipo `RadarDimension`.

## Routing

```
/auth        → AuthPage (sin layout)
/bienvenida  → WelcomePage (ProtectedRoute, SIN AppLayout) ← nuevo
/dashboard   → DashboardPage (ProtectedRoute + AppLayout)
...
```

`/bienvenida` se monta dentro de `ProtectedRoute` (sólo accesible autenticado) pero **fuera** de `AppLayout` (no carga sidebar ni topbar; es una pantalla "momento").

## Librería de gráficos

**Recharts** (`recharts@^3.8.1`, mismo paquete que el dashboard). Se usa el componente `RadarChart` con:

- `PolarGrid` `gridType="polygon"`, stroke `var(--color-border)` opacidad 0.35.
- `PolarAngleAxis` con un **tick component custom** (`AxisTick`) que parte labels multi-palabra en dos líneas vía `<tspan>` y usa `fontSize: 11` universal. Hereda el `textAnchor` que recharts calcula desde el ángulo del slice (start/middle/end) para que cada label "empuje" hacia afuera del centro.
- `outerRadius="65%"` y `margin={{ top: 24, right: 32, bottom: 24, left: 32 }}` para que los labels largos (ej. "Pronunciación", "Versatilidad") vivan dentro del SVG en viewports angostos (~320px) sin recortarse.
- Dominio fijo `[0, 100]` en `PolarRadiusAxis` (sin labels visibles, sólo los anillos).
- `Radar` con fill `var(--color-accent)`, `fillOpacity={0.28}`, `strokeWidth={2}`, `dot`.
- Animación de entrada (`isAnimationActive`, `animationDuration={1200}`).

Estilizado con variables CSS del tema, sin colores hardcodeados (consistente con el resto del frontend).

## Animación de entrada

Cascada con los keyframes ya definidos en `src/index.css`:

| Elemento | Clase | Delay |
|---|---|---|
| Wordmark + Heading | `animate-fade-in` | 0 ms |
| Radar | `animate-fade-in` + animación interna de recharts | 250 ms |
| Botón "Continuar" | `animate-fade-in` | 1500 ms (después de que termina la animación del radar) |

Glow ámbar de fondo: dos blobs con `bg-accent/20 blur-[80px]` reutilizando `animate-pulse-glow` y `animate-float`.

## Responsive

| Breakpoint | Layout |
|---|---|
| Móvil (`<sm`, 320-639px) | Padding `p-4`. Radar `w-full` con tope ~360px (aspect-square). Tick font 11 (universal). Botón full-width, `h-12`. `pb-safe`. |
| Tablet (`sm-md`, 640-1023px) | Padding `p-8`. Radar 480×480. Botón ancho `min-w-[200px]`. |
| Desktop (`md+`, ≥1024px) | Padding `p-12`. Contenedor `max-w-2xl`. Radar 520×520. Botón centrado `min-w-[220px]`. |

El `fontSize` del tick es uniforme (11px) en todos los breakpoints — escalar fonts dentro de un SVG via CSS media queries no es trivial (los `<text>` SVG escalan con `transform`, no con el viewport). En cambio, lo que sí escala correctamente es el `outerRadius` porcentual, que mantiene proporción con el contenedor.

Sin dependencia de `:hover` para nada esencial. Touch targets ≥ 44px. `100dvh` (no `100vh`). Labels cortos universales (no por breakpoint) para evitar reflow del radar al cambiar de orientación.

## Estados

| Estado | Render |
|---|---|
| `armed === true` | Pantalla completa con radar + saludo + botón. |
| `armed === false` | Redirección inmediata a `/dashboard` con `<Navigate replace />`. |
| Sin usuario en `useAuthStore` | El `ProtectedRoute` ya redirige a `/auth` antes de llegar aquí. |
| Datos | Siempre presentes (constante). No hay loading ni error. |

## Decisiones de diseño

- **Sin persistencia**: el flag es in-memory. Una recarga de `/bienvenida` antes de presionar "Continuar" mantiene la vista (estado de pestaña vivo). Cerrar el tab la pierde, que es el comportamiento deseado: la vista no es un tour, es un "momento de saludo" del login.
- **Fuera de `AppLayout`**: la pantalla quiere ser inmersiva. Si fuera dentro del layout, competiría con el sidebar y rompería la metáfora "momento".
- **Navegación con `replace: true`**: tras "Continuar", el back del browser no debe volver a `/bienvenida`. Idem en el login: el `navigate('/bienvenida', { replace: true })` evita que el back vuelva a `/auth`.
- **Labels cortos universales** (no responsive): probado que con labels largos como "Versatilidad lingüística" el radar reflowa al cambiar de orientación; con labels cortos el círculo se mantiene estable.
- **Scores de la primera sesión y no del promedio**: la consigna del producto es "estado actual al iniciar" — la primera sesión refleja la "baseline" del usuario, no su promedio histórico. Para Mario, sus scores actuales son notablemente más altos (final del curve del seeder), pero los iniciales son los apropiados para el "punto de partida" simbólico.

## Lo que NO incluye (YAGNI)

- Sin tests automáticos: el repo no tiene convención de tests para pantallas similares.
- Sin endpoint backend: la feature es 100% frontend con datos hardcodeados.
- Sin tooltips elaborados: el valor está implícito en el polígono y los anillos del radar.
- Sin botón "saltar" / "no mostrar más": la vista ya es de un solo paso.
