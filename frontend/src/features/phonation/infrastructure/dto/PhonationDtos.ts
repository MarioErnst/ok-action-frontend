export interface ExerciseResultDto {
  id: string;
  exercise_id: string;
  exercise_type: string;
  avg_hz: number;
  stability: number;
  breaks: number;
  in_range: boolean;
}

export interface PhonationSessionDto {
  id: string;
  overall_score: number;
  avg_hz: number;
  observations: string[];
  created_at: string;
  exercises: ExerciseResultDto[];
}

export interface PhonationSessionListItemDto {
  id: string;
  overall_score: number;
  avg_hz: number;
  created_at: string;
}

export interface SavePhonationSessionDto {
  overall_score: number;
  avg_hz: number;
  observations: string[];
  exercises: {
    exercise_id: string;
    exercise_type: string;
    avg_hz: number;
    stability: number;
    breaks: number;
    in_range: boolean;
  }[];
}
