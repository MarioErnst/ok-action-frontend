export interface LiveSessionListItemDto {
  id: string
  selected_dims: string[]
  overall_score: number | null
  stop_reason: string
  created_at: string
}
