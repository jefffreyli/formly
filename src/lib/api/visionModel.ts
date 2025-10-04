import { GoogleGenAI } from "@google/genai";
import type {
  ExerciseDetectionResult,
  FormQuality,
  ExerciseType,
} from "@/types/exercise";

const GEMINI_MODEL = "gemini-2.5-flash";

const VALID_FORM_QUALITIES: FormQuality[] = [
  "good",
  "needs_improvement",
  "poor",
];

const OVERHEAD_PRESS_PROMPT = `You are an expert physical therapist analyzing overhead press form. You are viewing a sequence of frames showing the movement over time. Analyze the ENTIRE MOVEMENT PATTERN and provide detailed feedback.

OVERHEAD PRESS MOVEMENT ANALYSIS:
The person may be performing overhead press with or WITHOUT weights/dumbbells - both are valid. Focus on body mechanics and form.

KEY FORM POINTS TO EVALUATE:
1. Starting Position:
   - Feet shoulder-width apart, stable base
   - Core engaged, ready position
   
2. Pressing Movement:
   - Smooth, controlled motion upward
   - Arms move in a straight vertical path (not forward/backward)
   - Core remains engaged throughout (no excessive back arch)
   - Head stays neutral (not jutting forward)
   - Shoulders stay stable and engaged
   
3. Top Position:
   - Arms fully extended overhead
   - Elbows locked out at the top
   - Body remains stable and balanced
   - Minimal to no back arch
   
4. Lowering Movement:
   - Controlled descent
   - Maintaining form on the way down

Analyze the sequence of frames to see if they're performing the full range of motion correctly.

Respond with a JSON object in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "Brief overall movement assessment in 1-2 sentences",
  "corrections": ["specific correction 1", "specific correction 2", "..."]
}

If the person is NOT performing an overhead press at all, set isPerformingExercise to false.

Example response:
{
  "isPerformingExercise": true,
  "quality": "needs_improvement",
  "feedback": "Good arm extension but excessive back arch during the press. Movement path is mostly vertical.",
  "corrections": ["Engage your core more to prevent lower back arch", "Keep your ribcage down throughout the movement", "Slow down the descent for better control"]
}`;

const EXTERNAL_ROTATION_PROMPT = `CRITICAL IDENTIFICATION: You are analyzing EXTERNAL ROTATION exercise, NOT bicep curls.

BEFORE YOU ANALYZE - READ THIS FIRST:
====================================
EXTERNAL ROTATION (what you're looking for):
- Elbow STAYS AT SIDE of body throughout (fixed position, pinned to ribs)
- Upper arm DOES NOT MOVE
- ONLY the forearm rotates away from body (outward/upward rotation)
- Forearm moves in an arc from front → side → up
- Elbow angle stays ~90 degrees (does NOT change)
- Movement is ROTATION at shoulder, not flexion

BICEP CURL (what this is NOT):
- Elbow MOVES FORWARD and UP away from body
- Forearm moves toward shoulder
- Elbow angle DECREASES (gets smaller/tighter)
- Movement is FLEXION at elbow, not rotation

KEY RULE: If the elbow is staying near the side of the body = EXTERNAL ROTATION (even if imperfect)
If the elbow is moving forward/up toward shoulder = Bicep curl

====================================

You are analyzing EXTERNAL ROTATION form - a rotator cuff exercise. The person rotates their forearm outward while keeping their elbow pinned at their side.

CORRECT MOVEMENT PATTERN FOR EXTERNAL ROTATION:
- Starting: Elbow bent 90°, upper arm against side, forearm pointing forward
- During: Forearm rotates OUTWARD and UPWARD like opening a door
- Key: Elbow stays glued to side of body, upper arm does not move
- End: Forearm pointing outward/upward, elbow STILL at side
- Return: Controlled lowering back to start

ANALYSIS CHECKLIST (Check in this order):
1. ✓ Is the ELBOW staying near/at the side of the body? 
   → YES = External Rotation (continue analysis)
   → NO (elbow moving up/forward) = Not external rotation

2. ✓ Is the UPPER ARM staying still against the body?
   → YES = Good
   → NO = Needs correction, but still external rotation

3. ✓ Is the FOREARM rotating outward (away from body)?
   → YES = Correct movement
   → NO = Needs coaching

4. ✓ Is the shoulder staying DOWN (not shrugging)?
   → YES = Good
   → NO = Needs correction

FORM POINTS TO EVALUATE:
- Elbow Position: Must stay at side (most critical)
- Upper Arm: Should not move away from body
- Rotation: Forearm rotating outward, not lifting
- Shoulder: Relaxed and down, not shrugged
- Control: Smooth, controlled movement
- Posture: Upright, not slouching

IMPORTANT REMINDERS:
- If elbow is at/near side of body = This IS external rotation (even if form needs work)
- Small movement is normal - this targets small rotator cuff muscles
- Be ENCOURAGING - recognize the attempt if they're doing external rotation

Common Issues (give constructive feedback):
- Elbow drifting away from side (cue: "Keep elbow at your side")
- Shoulder hiking up (cue: "Relax your shoulder down")
- Moving too quickly (cue: "Slow and controlled")
- Trunk rotation (cue: "Keep torso still")

RESPOND with a JSON object in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "Brief overall movement assessment in 1-2 sentences",
  "corrections": ["specific correction 1", "specific correction 2", "..."]
}

CRITICAL: If elbow is at/near the side of body and forearm is moving → set isPerformingExercise = TRUE (this is external rotation, not bicep curl)

Example responses:

Good form:
{
  "isPerformingExercise": true,
  "quality": "good",
  "feedback": "Excellent elbow position staying at your side. Smooth rotation with good control.",
  "corrections": ["Nice work! Maybe pause at the top for a second"]
}

Needs improvement but IS doing the exercise:
{
  "isPerformingExercise": true,
  "quality": "needs_improvement", 
  "feedback": "Good attempt at external rotation. Elbow is mostly at your side which is correct.",
  "corrections": ["Keep elbow tucked closer to your side", "Relax your shoulder down", "Move a bit slower"]
}`;

/**
 * Gets the appropriate prompt for the selected exercise
 */
function getExercisePrompt(exerciseType: ExerciseType): string {
  switch (exerciseType) {
    case "overhead_press":
      return OVERHEAD_PRESS_PROMPT;
    case "external_rotation":
      return EXTERNAL_ROTATION_PROMPT;
    default:
      return OVERHEAD_PRESS_PROMPT;
  }
}

/**
 * Analyzes exercise form in video frames using Gemini Vision API
 * @param videoFrames - Array of base64-encoded JPEG images (sequence of frames)
 * @param exerciseType - The type of exercise to analyze
 * @returns Promise resolving to form feedback result
 */
export async function detectExercise(
  videoFrames: string | string[],
  exerciseType: ExerciseType = "overhead_press"
): Promise<ExerciseDetectionResult> {
  // Validate API key exists
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Please add NEXT_PUBLIC_GEMINI_API_KEY to .env.local"
    );
  }

  // Convert single frame to array for consistent handling
  const frames = Array.isArray(videoFrames) ? videoFrames : [videoFrames];

  if (frames.length === 0) {
    throw new Error("No video frames provided");
  }

  try {
    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Build parts array with all frames followed by the prompt
    const parts = [
      ...frames.map((frame, index) => ({
        inlineData: {
          mimeType: "image/jpeg" as const,
          data: frame,
        },
      })),
      {
        text:
          frames.length > 1
            ? `${getExercisePrompt(exerciseType)}\n\nNote: You are viewing ${
                frames.length
              } frames captured over 6 seconds showing a COMPLETE REPETITION of the exercise in chronological order. Analyze the full movement from start to finish.`
            : getExercisePrompt(exerciseType),
      },
    ];

    // Generate content with images and text prompt
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts,
        },
      ],
      config: {
        temperature: 0.1, // Very low temperature for focused, deterministic responses
        maxOutputTokens: 250,
        // Disable thinking mode for faster responses with Flash
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    // Extract text from response
    const responseParts = response?.candidates?.[0]?.content?.parts || [];
    let rawResponse = "";

    for (const part of responseParts) {
      if (part.text) {
        rawResponse = part.text;
        break;
      }
    }

    if (!rawResponse) {
      console.error("No text found in Gemini response");
      throw new Error("No text response from Gemini API");
    }

    // Parse JSON response
    const formFeedback = parseFormFeedbackResponse(rawResponse);

    return {
      formFeedback,
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
 * Parses the VLM API response to extract form feedback
 * @param response - Raw text response from Gemini (should be JSON)
 * @returns Parsed form feedback
 */
function parseFormFeedbackResponse(response: string): {
  quality: FormQuality;
  feedback: string;
  corrections: string[];
  isPerformingExercise: boolean;
} {
  try {
    // Clean up response - sometimes the model adds markdown code blocks
    let cleaned = response.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleaned);

    // Validate and sanitize the response
    const quality = VALID_FORM_QUALITIES.includes(parsed.quality)
      ? parsed.quality
      : "needs_improvement";

    const feedback =
      typeof parsed.feedback === "string"
        ? parsed.feedback
        : "Unable to analyze form from this angle.";

    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.filter((c: unknown) => typeof c === "string")
      : [];

    const isPerformingExercise =
      typeof parsed.isPerformingExercise === "boolean"
        ? parsed.isPerformingExercise
        : false;

    return {
      quality,
      feedback,
      corrections,
      isPerformingExercise,
    };
  } catch (error) {
    console.error("Failed to parse form feedback:", error, response);
    // Return a default response if parsing fails
    return {
      quality: "needs_improvement",
      feedback:
        "Unable to analyze form. Please ensure you're visible in the frame.",
      corrections: ["Position yourself fully in view of the camera"],
      isPerformingExercise: false,
    };
  }
}
