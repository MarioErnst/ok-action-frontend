export type User = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  avatar?: string;
  completedExercises?: string[];
};