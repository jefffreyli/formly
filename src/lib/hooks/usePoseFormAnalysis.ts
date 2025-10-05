"use client";

import { useState, useEffect, useRef } from "react";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useAudioQueue } from "@/lib/hooks/useAudioQueue";
import { analyzePoseForExercise } from "@/lib/utils/poseAnalysis";
import { textToSpeech } from "@/lib/api/sessionService";
import { generateSpeechText } from "@/lib/utils/feedbackUtils";
import type { FormFeedback, ExerciseType } from "@/types/exercise";

// Define keypoint interface
interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface UsePoseFormAnalysisReturn {
  formFeedback: FormFeedback | null;
  isAnalyzing: boolean;
  error: string | null;
  fps: number;
}

/**
 * Hook for real-time form analysis using pose detection
 * Provides immediate feedback after detecting a full rep
 */
export function usePoseFormAnalysis(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
  exerciseType: ExerciseType
): UsePoseFormAnalysisReturn {
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    pose,
    isProcessing,
    error: poseError,
    fps,
  } = usePoseDetection(videoElement, enabled);
  const { enqueueAudio } = useAudioQueue();

  // Rep counting and analysis
  const repStateRef = useRef<{
    isInRep: boolean;
    repStartTime: number | null;
    lastAnalysisTime: number;
    keyframesPoses: Keypoint[][];
  }>({
    isInRep: false,
    repStartTime: null,
    lastAnalysisTime: 0,
    keyframesPoses: [],
  });

  /**
   * Detect if user is in a rep based on exercise-specific criteria
   */
  const detectRepState = (keypoints: Keypoint[]): boolean => {
    if (!keypoints || keypoints.length < 17) return false;

    // Simple heuristic: arms raised above shoulders
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];

    switch (exerciseType) {
      case "overhead_press":
      case "side_lateral_raise":
      case "front_lateral_raise":
        // In rep when arms are raised
        return (
          (leftWrist.y < leftShoulder.y && leftWrist.score! > 0.3) ||
          (rightWrist.y < rightShoulder.y && rightWrist.score! > 0.3)
        );

      case "external_rotation":
        // In rep when forearm is rotated out
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        const leftOut = leftWrist.x < leftElbow.x - 20;
        const rightOut = rightWrist.x > rightElbow.x + 20;
        return leftOut || rightOut;

      default:
        return false;
    }
  };

  /**
   * Process pose and provide form feedback
   */
  useEffect(() => {
    if (!enabled || !pose || !pose.keypoints) {
      repStateRef.current = {
        isInRep: false,
        repStartTime: null,
        lastAnalysisTime: 0,
        keyframesPoses: [],
      };
      return;
    }

    const now = Date.now();
    const { keypoints } = pose;
    const isCurrentlyInRep = detectRepState(keypoints);
    const state = repStateRef.current;

    // Rep started
    if (isCurrentlyInRep && !state.isInRep) {
      state.isInRep = true;
      state.repStartTime = now;
      state.keyframesPoses = [keypoints];
      console.log("⚡ Rep started");
    }
    // Rep in progress - collect keyframes
    else if (isCurrentlyInRep && state.isInRep) {
      // Collect keyframes every ~100ms
      if (
        state.keyframesPoses.length === 0 ||
        now - state.repStartTime! > state.keyframesPoses.length * 100
      ) {
        state.keyframesPoses.push(keypoints);
      }
    }
    // Rep ended - analyze!
    else if (!isCurrentlyInRep && state.isInRep) {
      state.isInRep = false;

      // Only analyze if enough time has passed since last analysis (debounce)
      if (now - state.lastAnalysisTime > 2000) {
        console.log(
          `⚡ Rep completed! Collected ${state.keyframesPoses.length} keyframes`
        );
        analyzeRep(state.keyframesPoses);
        state.lastAnalysisTime = now;
      }

      state.keyframesPoses = [];
      state.repStartTime = null;
    }
  }, [pose, enabled, exerciseType]);

  /**
   * Analyze the collected rep poses and provide feedback
   */
  const analyzeRep = async (repPoses: Keypoint[][]) => {
    if (repPoses.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze the middle pose (peak of rep) for form
      const middleIdx = Math.floor(repPoses.length / 2);
      const middlePose = repPoses[middleIdx];

      // Get form feedback
      const feedback = analyzePoseForExercise(middlePose, exerciseType);
      setFormFeedback(feedback);

      console.log("📊 Form analysis:", feedback);

      // Generate audio feedback if performing exercise
      if (feedback.isPerformingExercise) {
        const speechText = generateSpeechText(feedback);
        const ttsResult = await textToSpeech(speechText);

        if (ttsResult.success && ttsResult.audioUrl) {
          enqueueAudio(ttsResult.audioUrl);
          console.log("🔊 Audio feedback queued");
        }
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Propagate pose detection errors
  useEffect(() => {
    if (poseError) {
      setError(poseError);
    }
  }, [poseError]);

  return {
    formFeedback,
    isAnalyzing: isAnalyzing || isProcessing,
    error,
    fps,
  };
}
