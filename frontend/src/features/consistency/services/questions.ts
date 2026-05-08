export const CONSISTENCY_PROMPTS = [
  'Explica una propuesta de mejora para tu equipo de trabajo.',
  'Presenta tu opinion sobre una decision importante y justificala.',
  'Cuenta como resolverias un problema manteniendo una idea central.',
  'Describe un proyecto personal desde el objetivo hasta el resultado esperado.',
]

export function getNextConsistencyPrompt(currentPrompt: string): string {
  const currentIndex = CONSISTENCY_PROMPTS.indexOf(currentPrompt)
  return CONSISTENCY_PROMPTS[(currentIndex + 1) % CONSISTENCY_PROMPTS.length]
}
