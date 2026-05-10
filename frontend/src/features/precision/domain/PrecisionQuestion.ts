// Mirrors the backend PromptOut shape: the catalog field renamed
// difficulty_level to plain difficulty when prompts moved to the unified
// catalog, so the domain type follows.
export interface PrecisionQuestion {
  id: string
  text: string
  category: string
  difficulty: string
}
