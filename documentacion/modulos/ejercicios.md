# Módulo de Ejercicios

Catálogo de módulos prácticos del producto. Es el punto de entrada para iniciar cualquier ejercicio. Antes vivía dentro de `DashboardPage` como una grilla — al rediseñarse el dashboard para mostrar progreso, esta grilla se extrajo a su propia página.

Ruta: `/ejercicios`. Visible en el sidebar (escritorio) y en la `AppBottomBar` (móvil, dentro del row visible junto a Inicio).

Vive en `src/features/exercises/presentation/pages/ExercisesPage.tsx`.

## Qué muestra

Una grilla responsive con una `card` por cada módulo del `ModuleEnum` (excepto los items navegacionales `/dashboard`, `/ejercicios` y `/perfil`). Cada card incluye:

- Ícono del módulo (de `NavIcon`).
- Título en español.
- Descripción corta (constante `MODULE_DESCRIPTIONS` en el page).
- CTA "Comenzar" con flecha animada.

Al clickear cualquier card, navega a la ruta del módulo (`/fonacion`, `/pronunciacion`, etc.). No tiene estado propio — es una lista declarativa.

## Por qué se separó del dashboard

El dashboard pasó a ser una pantalla de **progreso** (gráficos y filtros). Mezclar el catálogo con los gráficos:

1. Saturaba la pantalla y diluía el foco.
2. Obligaba a hacer scroll para llegar al CTA principal ("comenzar un ejercicio") cuando los gráficos quedaban arriba.
3. Acopla decisiones de UX que tienen vida propia: el catálogo va a escalar (categorías, dificultad, favoritos) y el dashboard tiene su propio roadmap (más gráficos, comparativas, exports).

Con dos pantallas separadas cada una puede evolucionar independiente.

## Estructura

```
frontend/src/features/exercises/presentation/
└── pages/
    └── ExercisesPage.tsx
```

Es intencionalmente plana — toda la información (lista de módulos) viene de `NAV_ITEMS` (`shared/ui/config/navItems.ts`). No hay backend ni hook propio: el componente es estático.

## Responsive

| Breakpoint | Grilla |
|---|---|
| `<sm` (móvil) | 1 columna |
| `sm` | 2 columnas |
| `lg` | 3 columnas |
| `xl` | 4 columnas |

Padding inferior `pb-24` para no chocar con la `AppBottomBar` en móvil.

## Cómo agregar un módulo nuevo

1. Registrar la ruta en `AppRouter.tsx`.
2. Agregar la entrada en `NAV_ITEMS` (`shared/ui/config/navItems.ts`) con `icon` y `label`.
3. Agregar el ícono en `NavIcon.tsx` (`NavIconName` + `PATHS`) si no existe.
4. Agregar la descripción en `MODULE_DESCRIPTIONS` dentro de `ExercisesPage.tsx`.

El catálogo se actualiza solo (lee `NAV_ITEMS`), pero la descripción de tarjeta requiere agregar la línea correspondiente en `MODULE_DESCRIPTIONS` para no quedar vacía.

## Filtro por items de la bottom bar

Los módulos que ya viven como acceso directo en la `AppBottomBar` móvil
(`/dashboard`, `/capsulas`, `/sesion-libre`, `/perfil`, y la propia
`/ejercicios`) se excluyen de la grilla para que el usuario no vea una
tarjeta duplicada de algo a lo que llega con un tap desde cualquier
pantalla. La lista se concentra en el `Set` `BOTTOM_BAR_ROUTES`; si en el
futuro se agrega o quita un slot a la barra inferior, hay que actualizar
ese set y el archivo `AppBottomBar.tsx` en el mismo commit para mantener
el contrato sincronizado.
