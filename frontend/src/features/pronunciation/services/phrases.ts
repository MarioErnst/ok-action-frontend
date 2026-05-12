import type { PronunciationPhrase, PronunciationLevel } from '../domain/PronunciationSession'

const PHRASES: PronunciationPhrase[] = [
  // Basico
  { id: 'b1', text: 'La luna brilla sobre el mar.', level: 'basico' },
  { id: 'b2', text: 'Mi mama come una naranja.', level: 'basico' },
  { id: 'b3', text: 'El nino juega en el parque.', level: 'basico' },
  { id: 'b4', text: 'La flor roja es muy bonita.', level: 'basico' },
  { id: 'b5', text: 'Veo pajaros en el jardin.', level: 'basico' },
  { id: 'b6', text: 'El perro corre por el campo.', level: 'basico' },
  // Intermedio
  { id: 'i1', text: 'El ferrocarril recorre la sierra.', level: 'intermedio' },
  { id: 'i2', text: 'La lluvia cae sobre la calle mojada.', level: 'intermedio' },
  { id: 'i3', text: 'Jorge trabaja en la ciudad grande.', level: 'intermedio' },
  { id: 'i4', text: 'El reloj de la torre marca las tres.', level: 'intermedio' },
  { id: 'i5', text: 'Guillermo bebe jugo de naranja fresca.', level: 'intermedio' },
  { id: 'i6', text: 'La jirafa come hojas verdes del arbol.', level: 'intermedio' },
  // Avanzado
  { id: 'a1', text: 'El extraordinario guerrero cruzo la pradera.', level: 'avanzado' },
  { id: 'a2', text: 'La proyeccion refleja brillantes colores rojizos.', level: 'avanzado' },
  { id: 'a3', text: 'El ferroviario corrigio rapidamente el horario.', level: 'avanzado' },
  { id: 'a4', text: 'Glorioso amanecer sobre las verdes praderas rurales.', level: 'avanzado' },
  { id: 'a5', text: 'Jorge rechazo la oferta extraordinaria del generoso jefe.', level: 'avanzado' },
  { id: 'a6', text: 'El joven relojero reparo el viejo ferrocarril.', level: 'avanzado' },
]

export function getPhrasesByLevel(level: PronunciationLevel): PronunciationPhrase[] {
  return PHRASES.filter((phrase) => phrase.level === level)
}
