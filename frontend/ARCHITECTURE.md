# Arquitectura Frontend (Etapa 1: Auth)

## Enfoque

- Clean Architecture orientada a frontend.
- Atomic Design para UI compartida.
- Separación por feature para escalar módulos.

## Capas

- `domain`: entidades y contratos (sin dependencias de librerías).
- `application`: casos de uso y orquestación.
- `infrastructure`: adaptadores HTTP, DTOs y mappers.
- `presentation`: componentes, hooks de UI y estado local/global.

Regla: las dependencias deben apuntar hacia adentro.

## Atomic Design

Ubicación: `src/shared/ui`

- `atoms`: controles básicos reutilizables.
- `molecules`: composición simple de atoms.
- `organisms`: bloques de UI con intención de negocio de pantalla.

## Estado

- TanStack Query: server state (fetch, caché, mutaciones).
- Zustand: client state/UI state (ejemplo: sesión en memoria).

## Contrato con FastAPI (lineamientos)

- `src/api/client.ts` define cliente HTTP y `ApiError`.
- DTOs en infraestructura por feature.
- Mappers DTO ↔ entidad para no filtrar contratos externos al dominio.
- Errores de infraestructura se traducen a errores de dominio.

## Etapa 1 implementada

- Bootstrap app (`App`, providers, router básico).
- Shared base (`queryClient`, atoms iniciales).
- Feature `auth` end-to-end:
  - `domain`: `User`, `AuthRepository`, `AuthError`
  - `application`: `loginUseCase`
  - `infrastructure`: `HttpAuthRepository`, DTOs, mappers
  - `presentation`: store Zustand, hook de login, página y componentes

## Etapa 2 (siguiente)

- Implementar feature `phonation` respetando mismas capas.
- Incorporar rutas reales con React Router.
- Agregar tests unitarios por capa y tests de integración en casos de uso.
- Definir reglas de importación (ESLint boundaries) para reforzar arquitectura.

