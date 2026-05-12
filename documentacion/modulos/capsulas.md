# Módulo de Cápsulas

Catálogo de cápsulas de aprendizaje (videos cortos). Antes vivía dentro de la pantalla de perfil; al ganar relevancia se promovió a un módulo propio con ruta `/capsulas`, accesible directamente desde el sidebar.

Vive en `src/features/capsules/presentation/`.

## Qué muestra

`CapsulesPage` arma:
1. Header con el título "Cápsulas" y un subtítulo breve.
2. `VideoCapsulesSection` (organism) que pide al backend la lista, muestra el grid de tarjetas y abre el reproductor en modal al clickear una.

Cada tarjeta es una `VideoCard` (molecule) con título, icono de play y CTA implícito (toda la tarjeta es clickeable).

## Estructura Atomic Design

```
frontend/src/features/capsules/presentation/
├── components/
│   ├── molecules/
│   │   └── VideoCard.tsx
│   └── organisms/
│       └── VideoCapsulesSection.tsx
└── pages/
    └── CapsulesPage.tsx
```

## Integración con backend

| Endpoint | Estructura |
|---|---|
| `GET /api/videos` | `[{ id: UUID, title: string, url: string, filename: string }]` |

`url` es una presigned URL de Backblaze B2 válida por 1 hora, generada al vuelo por el backend. El bucket es privado; ninguna URL pública existe.

El frontend consume el endpoint vía `apiRequest`. No hay `fetch` directo. Tipos del DTO se mantienen inline en `VideoCapsulesSection.tsx` por su simplicidad (4 campos), no se necesitó una capa DTO separada.

## Reproductor

Al hacer click en una `VideoCard`, se abre un modal full-screen con un elemento `<video>` HTML5 que reproduce inline. Atributos obligatorios para iOS Safari:

- `autoPlay`: arranque automático.
- `muted`: necesario para que iOS no bloquee el autoplay.
- `playsInline`: evita que iOS lance el video a fullscreen forzado.

El modal se cierra al click fuera del player o en la X del header.

## Responsive

| Breakpoint | Grilla |
|---|---|
| `<sm` (móvil) | 2 columnas |
| `sm` | 3 columnas |
| `lg+` | 4 columnas |

El modal del reproductor cubre toda la pantalla en móvil (con margen mínimo) y queda en 4xl centrado en desktop.

## Para administrar el contenido

Hoy no hay UI de admin para subir o borrar cápsulas. Los endpoints `POST /api/videos/upload` y `DELETE /api/videos/{video_id}` existen en el backend pero el frontend solo consume el `GET`. Si en algún momento se agrega administración desde la app, viviría también en esta feature (`/capsulas/admin` o similar).
