import { GoogleGenAI } from "@google/genai";
import type {
  ExerciseDetectionResult,
  FormQuality,
  ExerciseType,
} from "@/types/exercise";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("VisionModel");

const GEMINI_MODEL = "gemini-2.5-flash";

const VALID_FORM_QUALITIES: FormQuality[] = [
  "good",
  "needs_improvement",
  "poor",
];

const OVERHEAD_PRESS_PROMPT = `You're a knowledgeable physical therapist analyzing overhead press form. Be accurate and fair in your feedback.

ANALYZE THE POSE KEYPOINT DATA:
Look at the shoulder, elbow, and wrist positions across the frames to assess the overhead press:

WHAT TO LOOK FOR (with reasonable margin of error):
1. OVERHEAD PRESS PATTERN:
   - Wrists should move UPWARD (decreasing y-values) and end ABOVE shoulders
   - Elbows should be roughly aligned with or slightly in front of shoulders
   - If wrists move FORWARD (bicep curl) or SIDEWAYS (lateral raise) → WRONG EXERCISE

2. ARM PATH (allow ~20-30 pixel variation):
   - Wrists should stay relatively vertical as they press up
   - Small deviations are OK - don't need to be perfectly straight
   - Major horizontal movement (>50 pixels) suggests wrong path

3. SHOULDER POSITION:
   - Shoulders should be reasonably stable (allow some natural movement)
   - Don't need to be perfectly still - some variation is normal
   - Look for general stability, not perfection

4. RANGE OF MOTION:
   - Wrists should end significantly higher than shoulders (fully overhead)
   - Full lockout is ideal but not required for "good" rating

RATING GUIDELINES:
- If they're doing a DIFFERENT exercise (bicep curl, lateral raise, etc.) → isPerformingExercise: false, quality: "poor"
- If arm movement shows upward pressing pattern with reasonable form → quality: "good"
- If pressing overhead but with noticeable form issues → quality: "needs_improvement"
- If form has serious upper body safety concerns or completely wrong movement → quality: "poor"
- Be accurate but fair - allow reasonable variation in human movement
- IGNORE lower body and hips - focus only on shoulders, elbows, wrists

FEEDBACK STYLE:
- Use "you/your" (not "the person")
- Be encouraging but honest
- Keep feedback to ONE SHORT SENTENCE ONLY (max 8 words)
- Give 2-3 specific, actionable tips about ARMS AND SHOULDERS
- Be accurate - call out wrong exercises, but encourage correct ones

Respond with JSON in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "One ultra-short sentence (max 8 words)",
  "corrections": ["Do this", "Try that", "Focus on this"]
}

GOOD form example (for solid pressing technique):
{
  "isPerformingExercise": true,
  "quality": "good",
  "feedback": "Great press, keep it up!",
  "corrections": ["Nice vertical path!", "Shoulders look stable", "Great control!"]
}

NEEDS IMPROVEMENT example (for minor arm/shoulder issues):
{
  "isPerformingExercise": true,
  "quality": "needs_improvement",
  "feedback": "Press more straight up.",
  "corrections": ["Keep arms vertical", "Don't press forward", "Full lockout overhead"]
}

POOR form example (for wrong exercise or safety issues):
{
  "isPerformingExercise": false,
  "quality": "poor",
  "feedback": "This isn't an overhead press.",
  "corrections": ["Press straight up overhead", "Keep weight above your head", "This is a different exercise"]
}`;

const SIDE_LATERAL_RAISE_PROMPT = `You're a knowledgeable physical therapist analyzing side lateral raise form. Be accurate and fair in your feedback.

ANALYZE THE MOVEMENT:
Watch how they raise their arms to the sides - check for:
- Are they actually doing a SIDE LATERAL RAISE (arms out to the SIDES, not front)?
- Arms moving out to sides (not forward/back)
- Slight elbow bend maintained
- Leading with elbows, not hands
- No shoulder shrugging
- Controlled movement, no swinging

RATING GUIDELINES:
- If they're doing a DIFFERENT exercise (front raise, overhead press, etc.) → isPerformingExercise: false, quality: "poor"
- If form is solid with good technique → quality: "good"
- If form has some issues but is mostly correct → quality: "needs_improvement"
- If form has serious safety concerns or completely wrong movement → quality: "poor"
- Be accurate but fair - recognize good effort when they're doing the right exercise

FEEDBACK STYLE:
- Use "you/your" (not "the person")
- Be encouraging but honest
- Keep feedback to ONE SHORT SENTENCE ONLY (max 8 words)
- Give 2-3 specific, actionable tips
- Be accurate - call out wrong exercises, but encourage correct ones

Respond with JSON in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "One ultra-short sentence (max 8 words)",
  "corrections": ["Do this", "Try that", "Focus on this"]
}

GOOD form example (for solid technique):
{
  "isPerformingExercise": true,
  "quality": "good",
  "feedback": "Nice lateral raise form!",
  "corrections": ["Keep those shoulders relaxed", "Great control!"]
}

NEEDS IMPROVEMENT example (for minor issues):
{
  "isPerformingExercise": true,
  "quality": "needs_improvement",
  "feedback": "Watch that shoulder shrug.",
  "corrections": ["Relax your shoulders down", "Lead with your elbows", "Keep it smooth"]
}

POOR form example (for wrong exercise or safety issues):
{
  "isPerformingExercise": false,
  "quality": "poor",
  "feedback": "This isn't a lateral raise.",
  "corrections": ["Raise arms out to the sides", "Not forward or overhead", "This is a different exercise"]
}`;

const FRONT_LATERAL_RAISE_PROMPT = `You're a knowledgeable physical therapist analyzing front lateral raise form. Be accurate and fair in your feedback.

ANALYZE THE MOVEMENT:
Watch how they raise their arms forward - check for:
- Are they actually doing a FRONT LATERAL RAISE (arms straight FORWARD, not to sides)?
- Arms moving straight forward
- Slight elbow bend maintained
- No backward lean or momentum
- Shoulders down (not shrugged)
- Lifting symmetrically

RATING GUIDELINES:
- If they're doing a DIFFERENT exercise (side raise, overhead press, etc.) → isPerformingExercise: false, quality: "poor"
- If form is solid with good technique → quality: "good"
- If form has some issues but is mostly correct → quality: "needs_improvement"
- If form has serious safety concerns or completely wrong movement → quality: "poor"
- Be accurate but fair - recognize good effort when they're doing the right exercise

FEEDBACK STYLE:
- Use "you/your" (not "the person")
- Be encouraging but honest
- Keep feedback to ONE SHORT SENTENCE ONLY (max 8 words)
- Give 2-3 specific, actionable tips
- Be accurate - call out wrong exercises, but encourage correct ones

Respond with JSON in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "One ultra-short sentence (max 8 words)",
  "corrections": ["Do this", "Try that", "Focus on this"]
}

GOOD form example (for solid technique):
{
  "isPerformingExercise": true,
  "quality": "good",
  "feedback": "Nice front raise form!",
  "corrections": ["Keep that control", "Great technique!"]
}

NEEDS IMPROVEMENT example (for minor issues):
{
  "isPerformingExercise": true,
  "quality": "needs_improvement",
  "feedback": "Keep your torso more still.",
  "corrections": ["Avoid leaning back", "Stand tall", "Control the descent"]
}

POOR form example (for wrong exercise or safety issues):
{
  "isPerformingExercise": false,
  "quality": "poor",
  "feedback": "This isn't a front raise.",
  "corrections": ["Raise arms straight forward", "Not to the sides", "This is a different exercise"]
}`;

const EXTERNAL_ROTATION_PROMPT = `You're a knowledgeable physical therapist analyzing external rotation form. Be accurate and fair in your feedback.

CRITICAL: This is EXTERNAL ROTATION, not bicep curls!
- Elbow STAYS at side of body (pinned to ribs)
- Only forearm rotates outward
- If elbow stays at side = external rotation ✓
- If elbow moves forward/up = NOT this exercise ✗

ANALYZE THE MOVEMENT:
- Are they actually doing EXTERNAL ROTATION (elbow pinned at side, only forearm rotates)?
- Is elbow staying at their side?
- Is forearm rotating outward?
- Is shoulder staying down?
- Is movement controlled?

RATING GUIDELINES:
- If they're doing a DIFFERENT exercise (bicep curl, lateral raise, etc.) → isPerformingExercise: false, quality: "poor"
- If elbow stays at side with good rotation → quality: "good"
- If elbow drifts slightly but mostly correct → quality: "needs_improvement"
- If elbow completely away from body (bicep curl motion) → isPerformingExercise: false, quality: "poor"
- Be accurate but fair - this exercise is specific but recognize good effort

FEEDBACK STYLE:
- Use "you/your" (not "the person")
- Be encouraging but honest
- Keep feedback to ONE SHORT SENTENCE ONLY (max 8 words)
- Give 2-3 specific, actionable tips
- Be accurate - call out wrong exercises, but encourage correct ones

Respond with JSON in this EXACT format:
{
  "isPerformingExercise": true/false,
  "quality": "good/needs_improvement/poor",
  "feedback": "One ultra-short sentence (max 8 words)",
  "corrections": ["Do this", "Try that", "Focus on this"]
}

GOOD form example (for solid technique):
{
  "isPerformingExercise": true,
  "quality": "good",
  "feedback": "Great external rotation!",
  "corrections": ["Keep that control", "Elbow stays pinned!"]
}

NEEDS IMPROVEMENT example (for minor elbow drift):
{
  "isPerformingExercise": true,
  "quality": "needs_improvement",
  "feedback": "Pin that elbow tighter.",
  "corrections": ["Press your elbow to your side", "Relax your shoulder", "Slow and steady"]
}

POOR form example (for wrong exercise):
{
  "isPerformingExercise": false,
  "quality": "poor",
  "feedback": "This isn't external rotation.",
  "corrections": ["Keep elbow at your side", "Only rotate your forearm", "This is a bicep curl"]
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
    case "side_lateral_raise":
      return SIDE_LATERAL_RAISE_PROMPT;
    case "front_lateral_raise":
      return FRONT_LATERAL_RAISE_PROMPT;
    default:
      return OVERHEAD_PRESS_PROMPT;
  }
}

/**
 * Analyzes exercise form using pose keypoints (FAST - no images needed!)
 * @param poseSequence - Array of pose snapshots with keypoint data
 * @param exerciseType - The type of exercise to analyze
 * @returns Promise resolving to form feedback result
 */
export async function detectExerciseFromPose(
  poseSequence: Array<{
    timestamp: number;
    keypoints: Array<{
      x: number;
      y: number;
      score: number;
      name?: string;
    }>;
    score: number;
  }>,
  exerciseType: ExerciseType = "overhead_press"
): Promise<ExerciseDetectionResult> {
  // Validate API key exists
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Please add NEXT_PUBLIC_GEMINI_API_KEY to .env.local"
    );
  }

  if (poseSequence.length === 0) {
    throw new Error("No pose data provided");
  }

  const startTime = Date.now();

  try {
    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Format pose data as text for Gemini
    const poseDataText = formatPoseSequenceForAnalysis(poseSequence);
    const fullPrompt = `${getExercisePrompt(
      exerciseType
    )}\n\nPOSE KEYPOINT DATA:\n${poseDataText}`;

    logger.debug("Full Prompt", {
      prompt: fullPrompt,
      fullLength: fullPrompt.length,
    });

    logger.geminiRequest(GEMINI_MODEL, fullPrompt.length, {
      exerciseType,
      poseFrames: poseSequence.length,
      method: "pose-keypoints",
    });

    logger.debug("Gemini Prompt", {
      prompt: fullPrompt.slice(0, 500) + "...",
      fullLength: fullPrompt.length,
    });

    // Use streaming for faster time-to-first-token
    const streamPromise = ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 200,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    // Await the promise to get the async generator
    const stream = await streamPromise;

    // Collect streamed response
    let rawResponse = "";

    for await (const chunk of stream) {
      const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
      rawResponse += chunkText;
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
 * Formats pose sequence data into readable text for Gemini analysis
 */
function formatPoseSequenceForAnalysis(
  poseSequence: Array<{
    timestamp: number;
    keypoints: Array<{
      x: number;
      y: number;
      score: number;
      name?: string;
    }>;
    score: number;
  }>
): string {
  const keyJoints = [
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
  ];

  let text = `Analyzing ${poseSequence.length} pose frames over ${
    poseSequence[poseSequence.length - 1].timestamp
  }ms\n\n`;

  poseSequence.forEach((pose, idx) => {
    text += `Frame ${idx + 1} (${pose.timestamp}ms):\n`;

    keyJoints.forEach((jointName) => {
      const joint = pose.keypoints.find((kp) => kp.name === jointName);
      if (joint && joint.score > 0.3) {
        text += `  ${jointName}: x=${Math.round(joint.x)}, y=${Math.round(
          joint.y
        )}\n`;
      }
    });

    text += "\n";
  });

  return text;
}

/**
 * Analyzes exercise form in video frames using Gemini Vision API with streaming
 * @param videoFrames - Array of base64-encoded JPEG images (sequence of frames)
 * @param exerciseType - The type of exercise to analyze
 * @returns Promise resolving to form feedback result
 */
export async function detectExercise(
  videoFrames: string | string[],
  exerciseType: ExerciseType = "overhead_press"
): Promise<ExerciseDetectionResult> {
  const startTime = Date.now();

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
    logger.geminiRequest(GEMINI_MODEL, 0, {
      exerciseType,
      frameCount: frames.length,
      method: "video-frames",
    });

    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Build parts array with all frames followed by the prompt
    const parts = [
      ...frames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg" as const,
          data: frame,
        },
      })),
      {
        text:
          frames.length > 1
            ? `${getExercisePrompt(exerciseType)}\n\nYou're viewing ${
                frames.length
              } frames over 6 seconds showing one complete rep. Watch the full movement.`
            : getExercisePrompt(exerciseType),
      },
    ];

    // Use streaming for faster time-to-first-token
    const streamPromise = ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [
        {
          parts,
        },
      ],
      config: {
        temperature: 0.3, // Low temperature for consistent, focused feedback
        maxOutputTokens: 200,
        // Disable thinking mode for faster responses
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    // Await the promise to get the async generator
    const stream = await streamPromise;

    // Collect streamed response
    let rawResponse = "";

    for await (const chunk of stream) {
      const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
      rawResponse += chunkText;
    }

    const duration = Date.now() - startTime;

    if (!rawResponse) {
      logger.error("No text found in Gemini response (video frames)");
      throw new Error("No text response from Gemini API");
    }

    logger.geminiResponse(GEMINI_MODEL, rawResponse.length, duration, {
      exerciseType,
      frameCount: frames.length,
      responsePreview: rawResponse.slice(0, 200),
    });

    logger.debug("Full Gemini Response (video)", { response: rawResponse });

    // Parse JSON response
    const formFeedback = parseFormFeedbackResponse(rawResponse);

    logger.info("Parsed form feedback (video)", {
      quality: formFeedback.quality,
      isPerformingExercise: formFeedback.isPerformingExercise,
    });

    return {
      formFeedback,
      rawResponse,
    };
  } catch (error) {
    logger.geminiError(GEMINI_MODEL, error, {
      exerciseType,
      frameCount: frames.length,
    });

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
    logger.debug("Parsing form feedback response", {
      rawLength: response.length,
      preview: response.slice(0, 100),
    });

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
        : "I can't quite see your form from this angle.";

    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.filter((c: unknown) => typeof c === "string")
      : [];

    const isPerformingExercise =
      typeof parsed.isPerformingExercise === "boolean"
        ? parsed.isPerformingExercise
        : false;

    logger.debug("Successfully parsed form feedback", {
      quality,
      isPerformingExercise,
      correctionsCount: corrections.length,
    });

    return {
      quality,
      feedback,
      corrections,
      isPerformingExercise,
    };
  } catch (error) {
    logger.error("Failed to parse form feedback", error, {
      response: response.slice(0, 500),
    });
    // Return a default response if parsing fails
    return {
      quality: "needs_improvement",
      feedback: "I need a better view - can you adjust your camera?",
      corrections: ["Make sure you're fully in frame", "Step back a bit"],
      isPerformingExercise: false,
    };
  }
}
