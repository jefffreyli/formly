import { NextRequest, NextResponse } from "next/server";
import { detectExerciseFromPose } from "@/lib/api/visionModel";
import type { ExerciseType } from "@/types/exercise";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:AnalyzePose");

export const runtime = "nodejs";
export const maxDuration = 10; // Fast - only 10 seconds max

interface AnalyzePoseRequest {
  poseSequence: Array<{
    timestamp: number;
    keypoints: Array<{
      x: number;
      y: number;
      score: number;
      name?: string;
    }>;
    score: number;
  }>;
  exerciseType: ExerciseType;
}

/**
 * POST /api/analyze-pose
 * Analyzes pose keypoints for exercise form and returns text feedback
 * MUCH FASTER than video frames - uses keypoint data instead of images
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzePoseRequest = await request.json();
    const { poseSequence, exerciseType } = body;

    logger.info("Received pose analysis request", {
      exerciseType,
      poseCount: poseSequence?.length,
    });

    // Validate request
    if (!poseSequence || poseSequence.length === 0) {
      logger.warn("Missing pose sequence data");
      return NextResponse.json(
        { error: "Missing pose sequence data" },
        { status: 400 }
      );
    }

    if (!exerciseType) {
      logger.warn("Missing exercise type");
      return NextResponse.json(
        { error: "Missing exercise type" },
        { status: 400 }
      );
    }

    // Analyze pose keypoints with Gemini
    const detectionResult = await detectExerciseFromPose(
      poseSequence,
      exerciseType
    );
    const { formFeedback } = detectionResult;

    const duration = Date.now() - startTime;
    logger.info("Pose analysis complete", {
      quality: formFeedback.quality,
      duration: `${duration}ms`,
    });

    // Return text feedback
    return NextResponse.json({
      success: true,
      formFeedback,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error analyzing pose", error, {
      duration: `${duration}ms`,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze pose";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
