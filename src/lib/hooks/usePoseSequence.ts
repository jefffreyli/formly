"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface Pose {
  keypoints: Keypoint[];
  score: number;
}

interface PoseSnapshot {
  timestamp: number;
  keypoints: Keypoint[];
  score: number;
}

interface UsePoseSequenceReturn {
  poseSequence: PoseSnapshot[];
  startRecording: () => void;
  stopRecording: () => PoseSnapshot[];
  clearSequence: () => void;
  isRecording: boolean;
}

/**
 * Hook to collect pose keypoints over time for exercise analysis
 * @param currentPose - The current pose from pose detection
 * @param targetFrameCount - Number of pose snapshots to collect (default: 10)
 * @returns Pose sequence collection state and controls
 */
export function usePoseSequence(
  currentPose: Pose | null,
  targetFrameCount: number = 10
): UsePoseSequenceReturn {
  const [poseSequence, setPoseSequence] = useState<PoseSnapshot[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const startTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  const startRecording = useCallback(() => {
    setPoseSequence([]);
    frameCountRef.current = 0;
    startTimeRef.current = Date.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    return poseSequence;
  }, [poseSequence]);

  const clearSequence = useCallback(() => {
    setPoseSequence([]);
    frameCountRef.current = 0;
    setIsRecording(false);
  }, []);

  // Collect pose snapshots while recording
  useEffect(() => {
    if (!isRecording || !currentPose || frameCountRef.current >= targetFrameCount) {
      return;
    }

    // Only collect poses with sufficient confidence
    if (currentPose.score < 0.3) {
      return;
    }

    const snapshot: PoseSnapshot = {
      timestamp: Date.now() - startTimeRef.current,
      keypoints: currentPose.keypoints.map((kp) => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name,
      })),
      score: currentPose.score,
    };

    setPoseSequence((prev) => [...prev, snapshot]);
    frameCountRef.current++;

    // Auto-stop when target frame count is reached
    if (frameCountRef.current >= targetFrameCount) {
      setIsRecording(false);
    }
  }, [currentPose, isRecording, targetFrameCount]);

  return {
    poseSequence,
    startRecording,
    stopRecording,
    clearSequence,
    isRecording,
  };
}
