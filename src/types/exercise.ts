export type ExerciseType = "overhead_press" | "external_rotation";

export type FormQuality = "good" | "needs_improvement" | "poor";

export interface FormFeedback {
  quality: FormQuality;
  feedback: string;
  corrections: string[];
  isPerformingExercise: boolean;
}

export interface ExerciseDetectionResult {
  formFeedback: FormFeedback;
  rawResponse: string;
}

export interface ExerciseInfo {
  id: ExerciseType;
  name: string;
  description: string;
}
