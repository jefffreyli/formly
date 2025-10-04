import { GoogleGenAI } from "@google/genai";
import type {
  ExerciseDetectionResult,
  ExerciseType,
  ConfidenceLevel,
} from "@/types/exercise";

const GEMINI_MODEL = "gemini-2.5-flash";

const VALID_EXERCISES: ExerciseType[] = [
  "squat",
  "lunge",
  "shoulder_press",
  "leg_raise",
  "plank",
  "push_up",
  "bicep_curl",
  "none",
];

const VALID_CONFIDENCE_LEVELS: ConfidenceLevel[] = ["high", "medium", "low"];

const DETECTION_PROMPT = `Analyze this image and identify which physical therapy exercise the person is performing.

EXERCISES:
- squat: person in lowered position with bent knees
- lunge: one leg forward, one back, knees bent  
- shoulder_press: arms raised overhead or pressing weights up
- leg_raise: leg lifted up while standing or lying
- plank: body horizontal, supported on forearms/hands and toes
- push_up: body horizontal, arms bent or extended in push-up position
- bicep_curl: arms bent at elbow, lifting weights toward shoulders
- none: no exercise or unclear

Look carefully at the person's body position and movements. Respond with ONLY the exercise name in lowercase, followed by | then your confidence level (high/medium/low).

Format: exercise_name|confidence
Example: shoulder_press|high`;

/**
 * Detects the exercise being performed in a video frame using Gemini Vision API
 * @param videoFrame - Base64-encoded JPEG image
 * @returns Promise resolving to exercise detection result
 */
export async function detectExercise(
  videoFrame: string
): Promise<ExerciseDetectionResult> {
  // Validate API key exists
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Please add NEXT_PUBLIC_GEMINI_API_KEY to .env.local"
    );
  }

  try {
    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Generate content with image and text prompt
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: videoFrame,
              },
            },
            {
              text: DETECTION_PROMPT,
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 150,
        // Disable thinking mode to get immediate responses
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    // Extract text from response
    const parts = response?.candidates?.[0]?.content?.parts || [];
    let rawResponse = "";

    for (const part of parts) {
      if (part.text) {
        rawResponse = part.text;
        break;
      }
    }

    if (!rawResponse) {
      console.error("No text found in Gemini response");
      throw new Error("No text response from Gemini API");
    }

    // Parse response format: "exercise|confidence"
    const parsed = parseDetectionResponse(rawResponse);

    return {
      exercise: parsed.exercise,
      confidence: parsed.confidence,
      rawResponse,
    };
  } catch (error) {
    console.error("Gemini API error:", error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("API key")) {
        throw new Error("Invalid API key or permissions");
      }
      if (error.message.includes("quota")) {
        throw new Error("Detection paused, try again soon");
      }
      if (error.message.includes("not found")) {
        throw new Error(
          "API endpoint not found - check API key and model availability"
        );
      }
      throw error;
    }

    throw new Error("Detection failed");
  }
}

/**
 * Parses the VLM API response to extract exercise and confidence
 * @param response - Raw text response from Gemini
 * @returns Parsed exercise and confidence level
 */
function parseDetectionResponse(response: string): {
  exercise: ExerciseType;
  confidence: ConfidenceLevel;
} {
  const trimmed = response.trim().toLowerCase();
  const parts = trimmed.split("|");

  if (parts.length !== 2) {
    console.warn("Invalid response format:", response);
    return { exercise: "none", confidence: "low" };
  }

  const [exerciseStr, confidenceStr] = parts;

  // Validate exercise
  const exercise = VALID_EXERCISES.includes(exerciseStr as ExerciseType)
    ? (exerciseStr as ExerciseType)
    : "none";

  // Validate confidence
  const confidence = VALID_CONFIDENCE_LEVELS.includes(
    confidenceStr as ConfidenceLevel
  )
    ? (confidenceStr as ConfidenceLevel)
    : "low";

  return { exercise, confidence };
}
