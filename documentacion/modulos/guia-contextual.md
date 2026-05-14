# Guia contextual

Feature frontend-only ubicada en `src/features/journey/`. Agrega ayuda guiada para orientar al usuario dentro de la aplicacion sin tocar backend ni persistencia remota.

## Que hace

- Muestra una guia general de la app despues de entrar al dashboard por primera vez en el navegador.
- Permite abrir guias por modulo mediante un boton llamado `Ayuda`.
- Explica que mide cada modulo, como empezar, que permisos puede requerir y como interpretar resultados.
- Usa popups anclados en escritorio y bottom sheet en movil.

## Activacion

La guia general se abre automaticamente una vez cuando el usuario llega a `/dashboard` y no existe la version actual marcada como vista en `localStorage`.

Las guias por modulo son manuales:

- el usuario presiona `Ayuda`;
- no se abren automaticamente;
- no se marcan como vistas;
- no cambian el estado interno del modulo.

## Estado local

El store vive en `presentation/store/journeyStore.ts`.

Estado principal:

- `journeySeenVersion`: version vista de la guia general.
- `activeGuideId`: guia activa o `null`.
- `currentStepIndex`: indice del paso actual.

Acciones principales:

- `startGuide(guideId)`;
- `nextStep()`;
- `previousStep()`;
- `closeGuide()`;
- `finishGuide()`.

La unica guia que persiste "vista" es `app-overview`. Las guias de modulo se pueden abrir cuantas veces sea necesario.

## Atomic Design

La implementacion respeta Atomic Design pragmatico:

```text
features/journey/
  domain/
    guideDefinitions.ts
  presentation/
    components/
      atoms/
        GuideHelpButton.tsx
        GuideStepCounter.tsx
        GuideHighlightFrame.tsx
      molecules/
        GuidePanelHeader.tsx
        GuidePanelActions.tsx
      organisms/
        GuideOverlay.tsx
        JourneyProvider.tsx
        ModuleGuideLauncher.tsx
    store/
      journeyStore.ts
```

## Definiciones de guias

El contenido vive en `domain/guideDefinitions.ts` como datos tipados. No se lee Markdown en runtime.

Cada guia define:

- `id`;
- `title`;
- `sourceDoc`;
- `persistSeen` si corresponde;
- `steps`.

Cada paso define:

- `title`;
- `body`;
- `route`;
- `anchorId` opcional.

`sourceDoc` apunta al documento tecnico que se uso como referencia para evitar explicar algo distinto a lo que hace el modulo.

## Anclas visuales

Las anclas se agregan con:

```tsx
data-journey-id="nombre-del-anchor"
```

Si el anchor existe y esta visible:

- en escritorio se muestra un marco resaltado;
- el panel intenta ubicarse cerca del elemento.

Si el anchor no existe o esta oculto:

- la guia sigue funcionando;
- en movil se usa siempre bottom sheet para no chocar con la `AppBottomBar`.

## Estados seguros

El boton `Ayuda` debe aparecer solo en estados no criticos:

- pantallas iniciales;
- seleccion de nivel, preset o consigna;
- resultados;
- historial.

No debe aparecer durante:

- grabacion;
- calibracion;
- guardado;
- subida de audio;
- evaluacion;
- camara o microfono activos.

## Modulos cubiertos

Incluye guias para:

- dashboard / vision general;
- ejercicios;
- capsulas;
- perfil;
- fonacion;
- pronunciacion;
- acentuacion;
- volumen;
- pausas;
- muletillas;
- precision;
- sesion libre;
- expresion facial;
- expresion corporal;
- fluidez;
- consistencia;
- versatilidad linguistica.

## Validacion

Comandos usados:

```powershell
npm.cmd test -- --configLoader native --pool=threads
npm.cmd run build -- --configLoader native
```

