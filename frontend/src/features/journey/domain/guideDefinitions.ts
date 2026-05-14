export const GUIDE_VERSION = 'journey:v1';
export const APP_OVERVIEW_GUIDE_ID = 'app-overview';

export type GuideId =
  | 'app-overview'
  | 'exercises'
  | 'phonation'
  | 'pronunciation'
  | 'accentuation'
  | 'loudness'
  | 'pauses'
  | 'muletillas'
  | 'precision'
  | 'live-session'
  | 'facial-expression'
  | 'body-expression'
  | 'fluency'
  | 'consistency'
  | 'linguistic-versatility'
  | 'capsules'
  | 'profile';

export type GuideStep = {
  title: string;
  body: string;
  route: string;
  anchorId?: string;
};

export type GuideDefinition = {
  id: GuideId;
  title: string;
  sourceDoc: string;
  persistSeen?: boolean;
  steps: GuideStep[];
};

const route = (path: string) => path;

export const GUIDE_DEFINITIONS: Record<GuideId, GuideDefinition> = {
  'app-overview': {
    id: 'app-overview',
    title: 'Guia general',
    sourceDoc: 'documentacion/modulos/dashboard.md',
    persistSeen: true,
    steps: [
      {
        title: 'Este es tu progreso',
        body: 'El inicio resume tu avance reciente y te ayuda a elegir que practicar despues.',
        route: route('/dashboard'),
        anchorId: 'dashboard-progress',
      },
      {
        title: 'Filtra tu avance',
        body: 'Puedes revisar todos los modulos o concentrarte en uno especifico por rango de tiempo.',
        route: route('/dashboard'),
        anchorId: 'dashboard-filters',
      },
      {
        title: 'Revisa tu rendimiento',
        body: 'Este grafico muestra como evoluciona tu puntaje promedio en las practicas realizadas.',
        route: route('/dashboard'),
        anchorId: 'dashboard-performance',
      },
      {
        title: 'Mide tu constancia',
        body: 'El tiempo diario permite saber si estas entrenando de forma sostenida.',
        route: route('/dashboard'),
        anchorId: 'dashboard-time',
      },
      {
        title: 'Practica por modulo',
        body: 'En ejercicios encuentras entrenamientos enfocados para voz, habla, expresion y precision.',
        route: route('/ejercicios'),
        anchorId: 'nav-exercises',
      },
      {
        title: 'Usa capsulas',
        body: 'Las capsulas entregan apoyo breve para reforzar conceptos antes o despues de practicar.',
        route: route('/capsulas'),
        anchorId: 'nav-capsules',
      },
      {
        title: 'Ensaya libremente',
        body: 'La sesion libre combina evaluaciones y feedback para simular una practica mas integral.',
        route: route('/sesion-libre'),
        anchorId: 'nav-live-session',
      },
      {
        title: 'Consulta tu historial',
        body: 'En tu perfil puedes revisar sesiones anteriores y entender como se acumula tu progreso.',
        route: route('/perfil'),
        anchorId: 'nav-profile',
      },
    ],
  },
  exercises: {
    id: 'exercises',
    title: 'Guia de ejercicios',
    sourceDoc: 'documentacion/modulos/ejercicios.md',
    steps: [
      {
        title: 'Elige que entrenar',
        body: 'Esta pantalla es el catalogo principal de modulos. Cada tarjeta abre una practica enfocada.',
        route: route('/ejercicios'),
        anchorId: 'exercises-intro',
      },
      {
        title: 'Lee la descripcion',
        body: 'La descripcion de cada tarjeta indica que aspecto de comunicacion medira el modulo.',
        route: route('/ejercicios'),
        anchorId: 'exercises-grid',
      },
      {
        title: 'Comienza por uno',
        body: 'Entra a un modulo, completa la practica y luego revisa el resultado en perfil o dashboard.',
        route: route('/ejercicios'),
        anchorId: 'exercises-grid',
      },
    ],
  },
  phonation: {
    id: 'phonation',
    title: 'Guia de fonacion',
    sourceDoc: 'documentacion/modulos/fonacion.md',
    steps: [
      {
        title: 'Entrena la voz',
        body: 'Fonacion analiza estabilidad, frecuencia y soporte vocal con ejercicios de voz.',
        route: route('/fonacion'),
        anchorId: 'phonation-intro',
      },
      {
        title: 'Selecciona ejercicios',
        body: 'Puedes elegir vocales sostenidas, frases o glissandos. Selecciona al menos uno para empezar.',
        route: route('/fonacion'),
        anchorId: 'phonation-selection',
      },
      {
        title: 'Habla durante la medicion',
        body: 'Al iniciar, permite el microfono y sigue la instruccion de cada ejercicio hasta terminar.',
        route: route('/fonacion'),
      },
      {
        title: 'Interpreta resultados',
        body: 'El resultado resume puntaje, frecuencia promedio, quiebres y observaciones de soporte vocal.',
        route: route('/fonacion'),
        anchorId: 'phonation-results',
      },
    ],
  },
  pronunciation: {
    id: 'pronunciation',
    title: 'Guia de pronunciacion',
    sourceDoc: 'documentacion/modulos/pronunciacion.md',
    steps: [
      {
        title: 'Elige dificultad',
        body: 'Selecciona un nivel segun la complejidad de las frases que quieras practicar.',
        route: route('/pronunciacion'),
        anchorId: 'pronunciation-levels',
      },
      {
        title: 'Lee cada frase',
        body: 'Durante la sesion, lee en voz alta cada frase y termina la grabacion cuando corresponda.',
        route: route('/pronunciacion'),
      },
      {
        title: 'Revisa fonemas',
        body: 'El resultado muestra metricas y detalle por frase para identificar sonidos que necesitan trabajo.',
        route: route('/pronunciacion'),
        anchorId: 'pronunciation-results',
      },
    ],
  },
  accentuation: {
    id: 'accentuation',
    title: 'Guia de acentuacion',
    sourceDoc: 'documentacion/modulos/acentuacion.md',
    steps: [
      {
        title: 'Practica el enfasis',
        body: 'Acentuacion trabaja silaba tonica, entonacion y ritmo al leer frases.',
        route: route('/acentuacion'),
        anchorId: 'accentuation-intro',
      },
      {
        title: 'Sigue las frases',
        body: 'Lee cada frase con naturalidad. El modulo indica la silaba tonica para guiarte.',
        route: route('/acentuacion'),
      },
      {
        title: 'Mira el detalle',
        body: 'Al finalizar veras metricas y feedback por frase para saber donde ajustar tu prosodia.',
        route: route('/acentuacion'),
        anchorId: 'accentuation-results',
      },
    ],
  },
  loudness: {
    id: 'loudness',
    title: 'Guia de volumen',
    sourceDoc: 'documentacion/modulos/volumen.md',
    steps: [
      {
        title: 'Elige un contexto',
        body: 'El preset define el rango esperado de volumen segun el tipo de situacion.',
        route: route('/volumen'),
        anchorId: 'loudness-preset',
      },
      {
        title: 'Calibra en silencio',
        body: 'Antes de medir, el modulo estima el ruido ambiente para comparar tu voz con una base real.',
        route: route('/volumen'),
      },
      {
        title: 'Ajusta tu intensidad',
        body: 'Durante la practica veras si tu voz esta baja, adecuada o demasiado alta.',
        route: route('/volumen'),
        anchorId: 'loudness-panel',
      },
    ],
  },
  pauses: {
    id: 'pauses',
    title: 'Guia de pausas',
    sourceDoc: 'documentacion/modulos/pausas.md',
    steps: [
      {
        title: 'Responde una consigna',
        body: 'Pausas mide silencios relevantes mientras respondes. No toda pausa es mala.',
        route: route('/pausas'),
        anchorId: 'pauses-intro',
      },
      {
        title: 'Espera la calibracion',
        body: 'Primero mantente en silencio para detectar el ruido base y luego habla con naturalidad.',
        route: route('/pausas'),
      },
      {
        title: 'Revisa el ritmo',
        body: 'El resultado muestra cantidad, duracion y proporcion de silencio para ajustar el ritmo.',
        route: route('/pausas'),
        anchorId: 'pauses-results',
      },
    ],
  },
  muletillas: {
    id: 'muletillas',
    title: 'Guia de muletillas',
    sourceDoc: 'documentacion/modulos/muletillas.md',
    steps: [
      {
        title: 'Carga una pregunta',
        body: 'El modulo te entrega una pregunta breve para responder en voz alta.',
        route: route('/muletillas'),
        anchorId: 'muletillas-question',
      },
      {
        title: 'Responde sin leer',
        body: 'Graba una respuesta natural. El analisis busca palabras de relleno que debilitan el mensaje.',
        route: route('/muletillas'),
      },
      {
        title: 'Usa el feedback',
        body: 'El resultado resume muletillas detectadas y recomendaciones para hablar con mayor control.',
        route: route('/muletillas'),
        anchorId: 'muletillas-results',
      },
    ],
  },
  precision: {
    id: 'precision',
    title: 'Guia de precision',
    sourceDoc: 'documentacion/modulos/precision.md',
    steps: [
      {
        title: 'Responde al punto',
        body: 'Precision evalua si tu respuesta es clara, relevante y concisa frente a cada pregunta.',
        route: route('/precision'),
        anchorId: 'precision-intro',
      },
      {
        title: 'Graba cada respuesta',
        body: 'Contesta en voz alta y finaliza cuando hayas terminado. El flujo avanza por rondas.',
        route: route('/precision'),
      },
      {
        title: 'Revisa cada ronda',
        body: 'Los resultados muestran el puntaje global y el detalle de cada respuesta evaluada.',
        route: route('/precision'),
        anchorId: 'precision-results',
      },
    ],
  },
  'live-session': {
    id: 'live-session',
    title: 'Guia de sesion libre',
    sourceDoc: 'documentacion/modulos/sesion-libre.md',
    steps: [
      {
        title: 'Selecciona dimensiones',
        body: 'Elige que aspectos quieres evaluar antes de iniciar el ensayo integral.',
        route: route('/sesion-libre'),
        anchorId: 'live-selection',
      },
      {
        title: 'Respeta la calibracion',
        body: 'La sesion puede pedir silencio inicial para calibrar audio y reducir falsos cortes.',
        route: route('/sesion-libre'),
      },
      {
        title: 'Practica completo',
        body: 'Habla como en una respuesta real. El sistema puede detenerse si detecta strikes sostenidos.',
        route: route('/sesion-libre'),
      },
      {
        title: 'Revisa feedback',
        body: 'Al terminar, veras puntajes, eventos y recomendaciones segun los modulos seleccionados.',
        route: route('/sesion-libre'),
        anchorId: 'live-results',
      },
    ],
  },
  'facial-expression': {
    id: 'facial-expression',
    title: 'Guia de expresion facial',
    sourceDoc: 'documentacion/modulos/expresion-facial.md',
    steps: [
      {
        title: 'Usa la camara',
        body: 'Este modulo detecta expresiones y gestos localmente mientras estas frente a la camara.',
        route: route('/expresion-facial'),
        anchorId: 'facial-intro',
      },
      {
        title: 'Calibra tu rostro',
        body: 'Al iniciar, mantente visible y estable para que el detector tenga una base limpia.',
        route: route('/expresion-facial'),
      },
      {
        title: 'Interpreta la distribucion',
        body: 'El resultado muestra que expresiones predominaron y que gestos se capturaron.',
        route: route('/expresion-facial'),
        anchorId: 'facial-results',
      },
    ],
  },
  'body-expression': {
    id: 'body-expression',
    title: 'Guia de expresion corporal',
    sourceDoc: 'documentacion/modulos/expresion-corporal.md',
    steps: [
      {
        title: 'Prepara el encuadre',
        body: 'La camara debe ver hombros, torso y manos cuando sea posible para medir postura y gestos.',
        route: route('/expresion-corporal'),
        anchorId: 'body-intro',
      },
      {
        title: 'Responde la consigna',
        body: 'Habla con naturalidad mientras el navegador analiza postura, apertura, energia y estabilidad.',
        route: route('/expresion-corporal'),
      },
      {
        title: 'Lee las metricas',
        body: 'El resultado resume presencia corporal, encuadre, manos visibles y movimiento excesivo.',
        route: route('/expresion-corporal'),
        anchorId: 'body-results',
      },
    ],
  },
  fluency: {
    id: 'fluency',
    title: 'Guia de fluidez',
    sourceDoc: 'documentacion/modulos/fluidez.md',
    steps: [
      {
        title: 'Habla sin trabarte',
        body: 'Fluidez analiza continuidad, ritmo, repeticiones y concordancia con la consigna.',
        route: route('/fluidez'),
        anchorId: 'fluency-intro',
      },
      {
        title: 'Usa la consigna',
        body: 'Puedes cambiar la pregunta antes de comenzar. Durante la grabacion, responde de forma continua.',
        route: route('/fluidez'),
        anchorId: 'fluency-prompt',
      },
      {
        title: 'Observa el feedback',
        body: 'El feedback aparece al cerrar la sesion y resume trabas, ritmo y recomendaciones.',
        route: route('/fluidez'),
        anchorId: 'fluency-feedback',
      },
    ],
  },
  consistency: {
    id: 'consistency',
    title: 'Guia de consistencia',
    sourceDoc: 'documentacion/modulos/consistencia.md',
    steps: [
      {
        title: 'Mantente estable',
        body: 'Consistencia revisa si el inicio, desarrollo y cierre sostienen claridad, foco y seguridad.',
        route: route('/consistencia'),
        anchorId: 'consistency-intro',
      },
      {
        title: 'Responde completo',
        body: 'El modulo analiza la respuesta como una pieza completa, por eso conviene cerrar la idea.',
        route: route('/consistencia'),
        anchorId: 'consistency-prompt',
      },
      {
        title: 'Revisa variaciones',
        body: 'El resultado indica si hubo cambios bruscos o perdida de estabilidad durante la respuesta.',
        route: route('/consistencia'),
        anchorId: 'consistency-feedback',
      },
    ],
  },
  'linguistic-versatility': {
    id: 'linguistic-versatility',
    title: 'Guia de versatilidad linguistica',
    sourceDoc: 'documentacion/modulos/versatilidad-linguistica.md',
    steps: [
      {
        title: 'Responde varias preguntas',
        body: 'Este modulo evalua variedad expresiva y riqueza de vocabulario en un flujo guiado.',
        route: route('/versatilidad-linguistica'),
        anchorId: 'versatility-intro',
      },
      {
        title: 'Evita repetir recursos',
        body: 'Intenta variar palabras, conectores y ejemplos para mostrar flexibilidad linguistica.',
        route: route('/versatilidad-linguistica'),
      },
      {
        title: 'Compara rondas',
        body: 'Al final puedes revisar el promedio y el detalle de cada respuesta.',
        route: route('/versatilidad-linguistica'),
        anchorId: 'versatility-results',
      },
    ],
  },
  capsules: {
    id: 'capsules',
    title: 'Guia de capsulas',
    sourceDoc: 'documentacion/modulos/capsulas.md',
    steps: [
      {
        title: 'Aprende con videos',
        body: 'Las capsulas son videos cortos para reforzar tecnicas antes o despues de practicar.',
        route: route('/capsulas'),
        anchorId: 'capsules-intro',
      },
      {
        title: 'Abre una capsula',
        body: 'Selecciona una tarjeta para reproducir el video en la interfaz sin perder el contexto.',
        route: route('/capsulas'),
        anchorId: 'capsules-list',
      },
      {
        title: 'Complementa la practica',
        body: 'Usa una capsula y luego vuelve a ejercicios para aplicar lo revisado.',
        route: route('/capsulas'),
      },
    ],
  },
  profile: {
    id: 'profile',
    title: 'Guia de perfil',
    sourceDoc: 'documentacion/modulos/perfil.md',
    steps: [
      {
        title: 'Revisa tus datos',
        body: 'El perfil muestra tu informacion principal y sirve como entrada al historial.',
        route: route('/perfil'),
        anchorId: 'profile-header',
      },
      {
        title: 'Consulta sesiones',
        body: 'El historial lista ejercicios realizados para revisar continuidad y resultados anteriores.',
        route: route('/perfil'),
        anchorId: 'profile-history',
      },
      {
        title: 'Usa el historial',
        body: 'Vuelve a practicar desde ejercicios cuando detectes un modulo que necesita refuerzo.',
        route: route('/perfil'),
      },
    ],
  },
};

export const getGuideDefinition = (guideId: GuideId): GuideDefinition =>
  GUIDE_DEFINITIONS[guideId] ?? GUIDE_DEFINITIONS[APP_OVERVIEW_GUIDE_ID];

export const getGuideStep = (guideId: GuideId, stepIndex: number): GuideStep => {
  const guide = getGuideDefinition(guideId);
  return guide.steps[Math.min(Math.max(stepIndex, 0), guide.steps.length - 1)];
};

export const isLastGuideStep = (guideId: GuideId, stepIndex: number): boolean =>
  stepIndex >= getGuideDefinition(guideId).steps.length - 1;

