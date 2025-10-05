"use client";

import { useState, useEffect, useRef } from "react";
import { useAudioQueue } from "@/lib/hooks/useAudioQueue";
import { analyzePoseSequence, textToSpeech } from "@/lib/api/sessionService";
import { generateSpeechText } from "@/lib/utils/feedbackUtils";
import type { FormFeedback, ExerciseType } from "@/types/exercise";
import { createLogger } from "@/lib/utils/logger";
import { addLog } from "@/components/FeedbackLog";
import {
  comparePoseToReference,
  findBestMatch,
} from "@/lib/utils/cosineSimilarity";
import { getReferencePosesFor } from "@/lib/utils/referencePoses";

const logger = createLogger("PoseExerciseDetection");

interface Pose {
  keypoints: Array<{
    x: number;
    y: number;
    score: number;
    name?: string;
  }>;
  score: number;
}

interface PoseSnapshot {
  timestamp: number;
  keypoints: Array<{
    x: number;
    y: number;
    score: number;
    name?: string;
  }>;
  score: number;
}

interface UsePoseExerciseDetectionReturn {
  formFeedback: FormFeedback | null;
  isDetecting: boolean;
  error: string | null;
  audioUrl: string | null;
}

const BUFFER_SIZE = 60; // Keep last 60 poses (~2-4 seconds at 15-30 FPS)
const MIN_REP_FRAMES = 20; // Reduced from 30 to 20 - faster detection (about 0.7-1.3 seconds)
const MAX_REP_FRAMES = 90; // Maximum frames for a rep (3 seconds at 30 FPS)

// Rep speed guidelines
const IDEAL_REP_DURATION_MIN = 1500; // 1.5 seconds minimum
const IDEAL_REP_DURATION_MAX = 4000; // 4 seconds maximum
const TOO_FAST_THRESHOLD = 1000; // Under 1 second is too fast
const TOO_SLOW_THRESHOLD = 6000; // Over 6 seconds is too slow

// Speed warning tracking
const SPEED_WARNING_THRESHOLD = 3; // Warn after 3 consecutive fast/slow reps
const RESTART_SUGGESTION_THRESHOLD = 5; // Suggest restart after 5 consecutive issues

/**
 * Hook for real-time exercise detection using sliding pose buffer
 * Analyzes form immediately after detecting one complete rep
 *
 * @param currentPose - The current pose from pose detection
 * @param enabled - Whether detection is enabled
 * @param exerciseType - The type of exercise to analyze
 * @returns Detection state and results
 */
export function usePoseExerciseDetection(
  currentPose: Pose | null,
  enabled: boolean,
  exerciseType: ExerciseType = "overhead_press"
): UsePoseExerciseDetectionReturn {
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const poseBufferRef = useRef<PoseSnapshot[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const repStartTimeRef = useRef<number>(0);
  const repNumberRef = useRef<number>(0);

  // Speed tracking
  const consecutiveFastRepsRef = useRef<number>(0);
  const consecutiveSlowRepsRef = useRef<number>(0);

  const { enqueueAudio, clearQueue } = useAudioQueue();

  // Detect rep completion based on vertical movement (works for most exercises)
  const detectRepCompletion = (buffer: PoseSnapshot[]): boolean => {
    if (buffer.length < MIN_REP_FRAMES) return false;

    // Get wrist positions (averaged between left and right)
    const getWristY = (pose: PoseSnapshot) => {
      const leftWrist = pose.keypoints.find((kp) => kp.name === "left_wrist");
      const rightWrist = pose.keypoints.find((kp) => kp.name === "right_wrist");
      if (!leftWrist || !rightWrist) return null;
      return (leftWrist.y + rightWrist.y) / 2;
    };

    // Look at full buffer for complete rep pattern
    const positions = buffer
      .map(getWristY)
      .filter((y) => y !== null) as number[];

    if (positions.length < MIN_REP_FRAMES) return false;

    // Find local min and max
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const range = max - min;

    // Reduced threshold from 120 to 80 pixels for faster, more sensitive detection
    // This makes it easier to detect movement without needing exaggerated motions
    if (range < 80) return false;

    // Check for complete down-up-down pattern by looking at the last portion
    // We want to detect when they've returned to the starting position
    const recentPositions = positions.slice(-10); // Last 10 frames
    const earlierPositions = positions.slice(0, 10); // First 10 frames

    const recentAvg =
      recentPositions.reduce((a, b) => a + b, 0) / recentPositions.length;
    const earlierAvg =
      earlierPositions.reduce((a, b) => a + b, 0) / earlierPositions.length;

    // Find the peak (highest point, which is lowest Y value)
    const peakIdx = positions.indexOf(min);
    const isPeakInMiddle =
      peakIdx > positions.length * 0.2 && peakIdx < positions.length * 0.8;

    // Rep is complete when:
    // 1. We've seen a peak in the middle of the buffer
    // 2. Current position is close to starting position (within 60 pixels - increased tolerance)
    // 3. There was significant range of motion
    // Increased tolerance from 50 to 60 pixels for easier detection
    return isPeakInMiddle && Math.abs(recentAvg - earlierAvg) < 60;
  };

  // Main effect: maintain sliding buffer and detect reps
  useEffect(() => {
    if (!enabled || !currentPose) {
      poseBufferRef.current = [];
      setIsDetecting(false);
      setError(null);
      return;
    }

    // Add current pose to sliding buffer
    const snapshot: PoseSnapshot = {
      timestamp: Date.now() - startTimeRef.current,
      keypoints: currentPose.keypoints,
      score: currentPose.score,
    };

    poseBufferRef.current.push(snapshot);

    // Keep buffer size limited
    if (poseBufferRef.current.length > BUFFER_SIZE) {
      poseBufferRef.current.shift();
    }

    // Check for rep completion
    const repCompleted = detectRepCompletion(poseBufferRef.current);

    if (repCompleted && !isDetecting) {
      // Calculate rep duration
      const repEndTime = Date.now();
      const repDuration = repEndTime - repStartTimeRef.current;

      // Start timing for next rep
      repStartTimeRef.current = repEndTime;
      repNumberRef.current++;

      // Analyze every single rep immediately!
      const analyzeRep = async () => {
        try {
          logger.info("Rep detected - starting analysis", {
            exerciseType,
            bufferSize: poseBufferRef.current.length,
            repDuration,
            repNumber: repNumberRef.current,
          });

          addLog(
            "success",
            "Movement",
            `Rep #${repNumberRef.current} detected! Duration: ${(
              repDuration / 1000
            ).toFixed(1)}s`,
            {
              exercise: exerciseType,
              frames: poseBufferRef.current.length,
              duration: repDuration,
            }
          );

          setIsDetecting(true);
          setError(null);

          // Take the full buffer for analysis (captures complete rep)
          const repData = [...poseBufferRef.current];

          // Check rep speed
          let speedFeedback = "";
          if (repDuration < TOO_FAST_THRESHOLD) {
            consecutiveFastRepsRef.current++;
            consecutiveSlowRepsRef.current = 0;
            speedFeedback = "⚠️ Too fast!";

            if (
              consecutiveFastRepsRef.current >= RESTART_SUGGESTION_THRESHOLD
            ) {
              addLog(
                "warning",
                "Speed",
                `${consecutiveFastRepsRef.current} reps too fast! Consider slowing down significantly`,
                {
                  consecutiveFast: consecutiveFastRepsRef.current,
                  suggestion: "restart_with_guide",
                }
              );
            } else if (
              consecutiveFastRepsRef.current >= SPEED_WARNING_THRESHOLD
            ) {
              addLog(
                "warning",
                "Speed",
                `${consecutiveFastRepsRef.current} reps too fast - please slow down`,
                {
                  consecutiveFast: consecutiveFastRepsRef.current,
                }
              );
            }
          } else if (repDuration > TOO_SLOW_THRESHOLD) {
            consecutiveSlowRepsRef.current++;
            consecutiveFastRepsRef.current = 0;
            speedFeedback = "⚠️ Too slow!";

            if (
              consecutiveSlowRepsRef.current >= RESTART_SUGGESTION_THRESHOLD
            ) {
              addLog(
                "warning",
                "Speed",
                `${consecutiveSlowRepsRef.current} reps too slow! Consider speeding up`,
                {
                  consecutiveSlow: consecutiveSlowRepsRef.current,
                  suggestion: "restart_with_guide",
                }
              );
            } else if (
              consecutiveSlowRepsRef.current >= SPEED_WARNING_THRESHOLD
            ) {
              addLog(
                "warning",
                "Speed",
                `${consecutiveSlowRepsRef.current} reps too slow - try to speed up`,
                {
                  consecutiveSlow: consecutiveSlowRepsRef.current,
                }
              );
            }
          } else if (repDuration < IDEAL_REP_DURATION_MIN) {
            speedFeedback = "A bit fast";
            consecutiveFastRepsRef.current++;
            consecutiveSlowRepsRef.current = 0;
          } else if (repDuration > IDEAL_REP_DURATION_MAX) {
            speedFeedback = "A bit slow";
            consecutiveSlowRepsRef.current++;
            consecutiveFastRepsRef.current = 0;
          } else {
            // Good pace - reset counters
            speedFeedback = "✓ Good pace";
            consecutiveFastRepsRef.current = 0;
            consecutiveSlowRepsRef.current = 0;
          }

          addLog("info", "Speed", speedFeedback, {
            duration: `${(repDuration / 1000).toFixed(1)}s`,
            ideal: `${IDEAL_REP_DURATION_MIN / 1000}-${
              IDEAL_REP_DURATION_MAX / 1000
            }s`,
          });

          // Use cosine similarity to verify they're doing the right exercise
          const referencePoses = getReferencePosesFor(exerciseType);
          const matchResult = findBestMatch(
            currentPose.keypoints,
            referencePoses
          );

          if (matchResult) {
            addLog(
              "info",
              "Pose Match",
              `Similarity score: ${(matchResult.similarity * 100).toFixed(1)}%`,
              {
                phase: matchResult.index + 1,
                similarity: matchResult.similarity,
              }
            );
          }

          logger.debug("Analyzing pose sequence", {
            poseCount: repData.length,
            firstTimestamp: repData[0]?.timestamp,
            lastTimestamp: repData[repData.length - 1]?.timestamp,
          });

          addLog("api", "API Call", `POST /api/analyze-pose`, {
            exerciseType,
            poseCount: repData.length,
          });

          const result = await analyzePoseSequence(repData, exerciseType);

          if (result.success && result.formFeedback) {
            logger.info("Analysis successful", {
              quality: result.formFeedback.quality,
              isPerformingExercise: result.formFeedback.isPerformingExercise,
            });

            addLog(
              result.formFeedback.quality === "good"
                ? "success"
                : result.formFeedback.quality === "poor"
                ? "error"
                : "warning",
              "Form Analysis",
              `Quality: ${result.formFeedback.quality} | ${result.formFeedback.feedback}`,
              {
                quality: result.formFeedback.quality,
                isCorrectExercise: result.formFeedback.isPerformingExercise,
                corrections: result.formFeedback.corrections,
              }
            );

            setFormFeedback(result.formFeedback);
            setError(null);

            // Generate and queue audio feedback (non-blocking)
            try {
              const speechText = generateSpeechText(result.formFeedback);
              logger.debug("Generating audio feedback", {
                textLength: speechText.length,
                text: speechText.slice(0, 100),
              });

              addLog("api", "API Call", `POST /api/text-to-speech`, {
                textLength: speechText.length,
              });

              const audioResult = await textToSpeech(speechText);

              if (audioResult.success && audioResult.audioUrl) {
                logger.info("Audio feedback generated", {
                  audioUrl: audioResult.audioUrl.slice(0, 100),
                });
                addLog(
                  "success",
                  "Audio",
                  "Speech generated, playing feedback"
                );
                setAudioUrl(audioResult.audioUrl);
                enqueueAudio(audioResult.audioUrl);
              } else {
                logger.warn("Audio generation failed", {
                  error: audioResult.error,
                });
                addLog(
                  "warning",
                  "Audio",
                  `Speech unavailable: ${audioResult.error || "API error"}`
                );
              }
            } catch (audioError) {
              // Don't let audio failures block feedback display
              const errorMessage =
                audioError instanceof Error
                  ? audioError.message
                  : String(audioError);
              logger.warn("Audio generation exception", {
                error: errorMessage,
              });
              addLog(
                "warning",
                "Audio",
                "Speech generation failed - continuing without audio",
                { error: errorMessage }
              );
            }
          } else {
            logger.error("Analysis failed", undefined, {
              error: result.error,
            });
            addLog("error", "API Error", `Analysis failed: ${result.error}`);
            setError(result.error || "Analysis failed");
          }
        } catch (err) {
          logger.error("Detection error", err);
          addLog("error", "Error", `Failed to analyze rep: ${err}`);
          setError(err instanceof Error ? err.message : "Detection failed");
        } finally {
          setIsDetecting(false);
        }
      };

      analyzeRep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPose, enabled, exerciseType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearQueue();
      poseBufferRef.current = [];
    };
  }, [clearQueue]);

  return {
    formFeedback,
    isDetecting,
    error,
    audioUrl,
  };
}
