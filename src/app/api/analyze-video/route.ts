import { NextRequest, NextResponse } from "next/server";
import { detectExercise } from "@/lib/api/visionModel";
import type { ExerciseType } from "@/types/exercise";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max for video analysis

interface AnalyzeVideoRequest {
  videoFrames: string[]; // base64 encoded frames
  exerciseType: ExerciseType;
}

/**
 * POST /api/analyze-video
 * Analyzes video frames for exercise form and returns text feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeVideoRequest = await request.json();
    const { videoFrames, exerciseType } = body;

    // Validate request
    if (!videoFrames || videoFrames.length === 0) {
      return NextResponse.json(
        { error: "Missing video frames" },
        { status: 400 }
      );
    }

    if (!exerciseType) {
      return NextResponse.json(
        { error: "Missing exercise type" },
        { status: 400 }
      );
    }

    // Analyze video frames with Gemini Vision API
    const detectionResult = await detectExercise(videoFrames, exerciseType);
    const { formFeedback } = detectionResult;

    // Return text feedback
    return NextResponse.json({
      success: true,
      formFeedback,
    });
  } catch (error) {
    console.error("Error analyzing video:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze video";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
