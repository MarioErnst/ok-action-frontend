# Módulo de Perfil

El módulo de Perfil (`src/features/profile`) es la sección encargada de mostrar la información general del usuario, su progreso histórico y acceso rápido a contenido educativo complementario. 

Se accede a esta vista a través del avatar en la barra de navegación (sidebar en escritorio o drawer inferior en dispositivos móviles) en la ruta `/perfil`.

## Componentes principales

La página principal (`ProfilePage.tsx`) centraliza tres responsabilidades clave:
1. **Header de Usuario**: Muestra el nombre y correo del usuario activo utilizando el estado global de `useAuthStore`.
2. **Historial de Ejercicios (`ExerciseHistory.tsx`)**: Muestra un consolidado de los diferentes módulos del sistema (Fonación, Pronunciación, Acentuación, etc.) usando un diseño en forma de cuadrícula de tarjetas (grid). Al hacer clic en un módulo, se despliega un Modal dinámico, implementado con **React Portals**, que detalla los ejercicios específicos realizados.
3. **Cápsulas de Aprendizaje (`VideoCapsulesSection.tsx`)**: Renderiza una cuadrícula con cápsulas en video educativas para que el usuario mejore sus habilidades comunicativas.

## Documentación de la integración de Cápsulas de Aprendizaje (Videos)

El componente `VideoCapsulesSection.tsx` está integrado con el backend del sistema para solicitar la lista de videos disponibles de forma dinámica.

### Flujo de datos

1. **Endpoint**: Al montar el componente, se ejecuta un efecto (`useEffect`) que hace una llamada HTTP **GET** usando `axios` al endpoint de la API:
   `http://localhost:8000/videos`

2. **Estructura esperada por el Frontend**:
   El backend debe responder con un código HTTP `200 OK` y un payload JSON que sea una lista (array) de objetos con la siguiente interfaz:
   ```typescript
   interface VideoData {
     id: string;
     title: string;
     url: string;
   }
   ```
   *Ejemplo de respuesta válida:*
   ```json
   [
     { "id": "1", "title": "Técnicas de respiración", "url": "https://ejemplo.com/video1.mp4" },
     { "id": "2", "title": "Cómo evitar muletillas", "url": "https://ejemplo.com/video2.mp4" }
   ]
   ```

3. **Fallback (Datos de prueba / Mock)**: 
   Actualmente, el componente incluye un bloque `.catch()` como fallback. Esto significa que **si el servidor backend está apagado, no devuelve la ruta o lanza error**, el frontend interceptará ese fallo e inyectará automáticamente 3 videos "de prueba" en la interfaz. 
   Esto se hizo para permitir seguir construyendo visualmente la interfaz y comprobar que la cuadrícula y las tarjetas (`VideoCard.tsx`) funcionan y se adaptan a móviles correctamente, sin depender estrictamente de la disponibilidad del backend.
   *Nota: Cuando el backend retorne datos reales correctamente (aunque sea un array vacío `[]`), el fallback NO se ejecutará. Si retorna `[]`, el frontend mostrará el texto "No hay videos disponibles". Para poblar la vista real, se deben insertar registros en la base de datos del backend.*

4. **Visualización (`VideoCard.tsx`)**:
   Cada video recibido (ya sea del backend o del mock) se itera y se pasa al componente `VideoCard`. En lugar de incrustar reproductores HTML crudos (`<video>`), que rompían la estética y resultaban pesados, las tarjetas ahora se renderizan como botones/enlaces estilizados que mantienen la coherencia visual con el resto de módulos del Dashboard. Al presionar en "Ver cápsula", el botón redirige al usuario a la URL del video (`url`) en una nueva pestaña.