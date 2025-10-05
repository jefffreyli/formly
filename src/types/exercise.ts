export type ExerciseType =
  | "overhead_press"
  | "external_rotation"
  | "side_lateral_raise"
  | "front_lateral_raise";

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
