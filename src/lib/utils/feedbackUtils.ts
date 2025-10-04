import type { FormFeedback } from "@/types/exercise";

/**
 * Generates natural speech text from form feedback
 */
export function generateSpeechText(formFeedback: FormFeedback): string {
  if (!formFeedback.isPerformingExercise) {
    return "I don't see you performing the exercise. Please position yourself in view of the camera.";
  }

  let speech = formFeedback.feedback;

  // Add the most important correction if available
  if (formFeedback.corrections.length > 0) {
    const mainCorrection = formFeedback.corrections[0];
    speech += `. ${mainCorrection}`;
  }

  return speech;
}
