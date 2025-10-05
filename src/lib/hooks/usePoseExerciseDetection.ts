"use client";

import { useState, useEffect, useRef } from "react";
import { useAudioQueue } from "@/lib/hooks/useAudioQueue";
import { analyzePoseSequence, textToSpeech } from "@/lib/api/sessionService";
import { generateSpeechText } from "@/lib/utils/feedbackUtils";
import type { FormFeedback, ExerciseType } from "@/types/exercise";
import { createLogger } from "@/lib/utils/logger";

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
const MIN_REP_FRAMES = 30; // Minimum frames for a valid rep (about 1-2 seconds)
const ANALYSIS_COOLDOWN = 5000; // 5 seconds cooldown between analyses

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
  const lastAnalysisTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

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
    const positions = buffer.map(getWristY).filter((y) => y !== null) as number[];

    if (positions.length < MIN_REP_FRAMES) return false;

    // Find local min and max
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const range = max - min;

    // Need significant vertical movement (e.g., 120+ pixels for a full rep)
    if (range < 120) return false;

    // Check for complete down-up-down pattern by looking at the last portion
    // We want to detect when they've returned to the starting position
    const recentPositions = positions.slice(-10); // Last 10 frames
    const earlierPositions = positions.slice(0, 10); // First 10 frames

    const recentAvg = recentPositions.reduce((a, b) => a + b, 0) / recentPositions.length;
    const earlierAvg = earlierPositions.reduce((a, b) => a + b, 0) / earlierPositions.length;

    // Find the peak (highest point, which is lowest Y value)
    const peakIdx = positions.indexOf(min);
    const isPeakInMiddle = peakIdx > positions.length * 0.2 && peakIdx < positions.length * 0.8;

    // Rep is complete when:
    // 1. We've seen a peak in the middle of the buffer
    // 2. Current position is close to starting position (within 50 pixels)
    // 3. There was significant range of motion
    return isPeakInMiddle && Math.abs(recentAvg - earlierAvg) < 50;
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
    const timeSinceLastAnalysis = Date.now() - lastAnalysisTimeRef.current;
    const canAnalyze = timeSinceLastAnalysis > ANALYSIS_COOLDOWN;

    if (repCompleted && canAnalyze && !isDetecting) {
      // Analyze immediately!
      const analyzeRep = async () => {
        try {
          logger.info("Rep detected - starting analysis", {
            exerciseType,
            bufferSize: poseBufferRef.current.length,
          });

          setIsDetecting(true);
          setError(null);
          lastAnalysisTimeRef.current = Date.now();

          // Take the full buffer for analysis (captures complete rep)
          const repData = [...poseBufferRef.current];

          logger.debug("Analyzing pose sequence", {
            poseCount: repData.length,
            firstTimestamp: repData[0]?.timestamp,
            lastTimestamp: repData[repData.length - 1]?.timestamp,
          });

          const result = await analyzePoseSequence(repData, exerciseType);

          if (result.success && result.formFeedback) {
            logger.info("Analysis successful", {
              quality: result.formFeedback.quality,
              isPerformingExercise: result.formFeedback.isPerformingExercise,
            });

            setFormFeedback(result.formFeedback);
            setError(null);

            // Generate and queue audio feedback
            const speechText = generateSpeechText(result.formFeedback);
            logger.debug("Generating audio feedback", {
              textLength: speechText.length,
              text: speechText.slice(0, 100),
            });

            const audioResult = await textToSpeech(speechText);

            if (audioResult.success && audioResult.audioUrl) {
              logger.info("Audio feedback generated", {
                audioUrl: audioResult.audioUrl.slice(0, 100),
              });
              setAudioUrl(audioResult.audioUrl);
              enqueueAudio(audioResult.audioUrl);
            } else {
              logger.warn("Audio generation failed", {
                error: audioResult.error,
              });
            }
          } else {
            logger.error("Analysis failed", undefined, {
              error: result.error,
            });
            setError(result.error || "Analysis failed");
          }
        } catch (err) {
          logger.error("Detection error", err);
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
