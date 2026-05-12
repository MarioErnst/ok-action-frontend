# Módulo de Perfil

El módulo de Perfil (`src/features/profile`) es la sección encargada de mostrar la información general del usuario, su progreso histórico y acceso rápido a contenido educativo complementario.

Se accede a esta vista a través del avatar en la barra de navegación (sidebar en escritorio o drawer inferior en dispositivos móviles) en la ruta `/perfil`.

## Estructura Atomic Design

El módulo ha sido reestructurado siguiendo la metodología de **Atomic Design** para mejorar la escalabilidad y reutilización de componentes:

- **Atoms**: Elementos base de UI (botones, spinners de carga, avatares simples).
- **Molecules**: Componentes que agrupan átomos con una sola responsabilidad.
- **Organisms**: Secciones completas de la interfaz que manejan lógica y estados complejos (ej. `ExerciseHistory`).
- **Pages**: Las vistas principales que orquestan los organismos (ej. `ProfilePage`).

```
frontend/src/features/profile/presentation/
├── components/
│   └── organisms/
│       └── ExerciseHistory.tsx
└── pages/
    └── ProfilePage.tsx
```

## Componentes principales

La página principal (`ProfilePage.tsx`) centraliza dos responsabilidades:
1. **Header de Usuario**: Muestra el nombre y correo del usuario activo utilizando el estado global de `useAuthStore`.
2. **Historial de Ejercicios (`ExerciseHistory.tsx`)**: Muestra un consolidado de los diferentes módulos del sistema obtenido dinámicamente desde el backend (`GET /api/profile/history`). Al hacer clic en un módulo, se despliega un Modal dinámico que detalla los ejercicios específicos.

Las cápsulas de aprendizaje viven ahora en su propio módulo en `/capsulas` (ver `capsulas.md`). El perfil queda enfocado en datos del usuario e historial.

## Integración con Backend

El módulo ya no contiene datos quemados (hardcoded). Se comunica con el backend a través del cliente configurado (`frontend/src/api/client.ts`), inyectando de forma automática el token JWT.

### Historial de Ejercicios
1. **Endpoint**: `GET /api/profile/history`
2. **Estructura**: Un arreglo de módulos con `averageScore` y `categories`. El frontend detecta automáticamente si existe progreso (`averageScore > 0` o un ejercicio con `viewed: true`) para determinar si mostrar la vista vacía o renderizar las tarjetas.