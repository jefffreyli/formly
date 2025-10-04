import { nanoid } from "nanoid";
import type { ExerciseType } from "@/types/exercise";

/**
 * Generates a unique session ID
 */
export function createSessionId(): string {
  return nanoid(16);
}

/**
 * Stores session ID in sessionStorage for persistence across page refreshes
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("formly_session_id", sessionId);
  }
}

/**
 * Retrieves session ID from sessionStorage
 */
export function getStoredSessionId(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("formly_session_id");
  }
  return null;
}

/**
 * Gets or creates a session ID
 */
export function getOrCreateSessionId(): string {
  const stored = getStoredSessionId();
  if (stored) {
    return stored;
  }

  const newSessionId = createSessionId();
  storeSessionId(newSessionId);
  return newSessionId;
}

/**
 * Clears the current session
 */
export function clearSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("formly_session_id");
  }
}

/**
 * Sends video frames to the server for analysis (text feedback only)
 */
export async function analyzeVideoToText(
  videoFrames: string[],
  exerciseType: ExerciseType
): Promise<{
  success: boolean;
  formFeedback?: {
    quality: string;
    feedback: string;
    corrections: string[];
    isPerformingExercise: boolean;
  };
  error?: string;
}> {
  try {
    const response = await fetch("/api/analyze-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoFrames,
        exerciseType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to analyze video");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to analyze video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

/**
 * Converts text to speech using ElevenLabs
 */
export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<{
  success: boolean;
  audioUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate speech");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to generate speech:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "TTS failed",
    };
  }
}
