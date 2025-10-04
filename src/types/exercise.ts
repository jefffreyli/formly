export type ExerciseType =
  | "squat"
  | "lunge"
  | "shoulder_press"
  | "leg_raise"
  | "plank"
  | "push_up"
  | "bicep_curl"
  | "none";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ExerciseDetectionResult {
  exercise: ExerciseType;
  confidence: ConfidenceLevel;
  rawResponse: string;
}
