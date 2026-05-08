export const FLUENCY_PROMPTS = [
  'Describe una experiencia en la que tuviste que explicar una idea compleja.',
  'Cuenta brevemente una situacion donde tuviste que improvisar una respuesta.',
  'Explica por que es importante comunicarse con claridad en un equipo.',
  'Presenta una idea de mejora para una aplicacion que usas seguido.',
]

export function getNextFluencyPrompt(currentPrompt: string): string {
  const currentIndex = FLUENCY_PROMPTS.indexOf(currentPrompt)
  return FLUENCY_PROMPTS[(currentIndex + 1) % FLUENCY_PROMPTS.length]
}

