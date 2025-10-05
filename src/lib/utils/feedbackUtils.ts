import type { FormFeedback, FormQuality } from "@/types/exercise";

/**
 * Generates natural speech text from form feedback
 * This should match what's displayed in the ExerciseDetectionOverlay
 */
export function generateSpeechText(formFeedback: FormFeedback): string {
  if (!formFeedback.isPerformingExercise) {
    return "I don't see you performing the exercise. Please position yourself in view of the camera.";
  }

  // Match the overlay display: quality label + correction
  const qualityLabels: Record<FormQuality, string> = {
    good: "Good",
    needs_improvement: "Fair", 
    poor: "Poor"
  };

  let speech = qualityLabels[formFeedback.quality];

  // Add the most important correction if available (same as overlay)
  if (formFeedback.corrections.length > 0) {
    const mainCorrection = formFeedback.corrections[0];
    speech += `. ${mainCorrection}`;
  }

  return speech;
}
