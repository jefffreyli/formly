import { useState, useEffect, useRef } from "react";
import { detectExercise } from "@/lib/api/visionModel";
import { useFrameCapture } from "@/lib/hooks/useFrameCapture";
import type { ExerciseType, ConfidenceLevel } from "@/types/exercise";

interface UseLiveExerciseDetectionReturn {
  detectedExercise: ExerciseType | null;
  confidence: ConfidenceLevel | null;
  isDetecting: boolean;
  error: string | null;
}

const DETECTION_INTERVAL = 2000; // 2 seconds between detections
const CACHE_DURATION = 4000; // Cache results for 4 seconds

/**
 * Hook for live exercise detection from video stream
 * @param videoElement - The HTML video element to analyze
 * @param enabled - Whether detection is enabled
 * @returns Detection state and results
 */
export function useLiveExerciseDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean
): UseLiveExerciseDetectionReturn {
  const [detectedExercise, setDetectedExercise] = useState<ExerciseType | null>(
    null
  );
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { captureFrame } = useFrameCapture(videoElement);

  // Refs for managing detection lifecycle
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const cachedResultRef = useRef<{
    exercise: ExerciseType;
    confidence: ConfidenceLevel;
    timestamp: number;
  } | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    // Validate API key on initialization
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (enabled && !apiKey) {
      setError("Please add GEMINI_API_KEY to .env.local");
      return;
    }

    if (!enabled || !videoElement) {
      // Clear interval if detection is disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsDetecting(false);
      setError(null);
      return;
    }

    // Start detection loop
    const runDetection = async () => {
      const now = Date.now();

      // Throttle: ensure minimum time between detections
      if (now - lastDetectionTimeRef.current < DETECTION_INTERVAL) {
        return;
      }

      // Check cache
      if (cachedResultRef.current) {
        const cacheAge = now - cachedResultRef.current.timestamp;
        if (cacheAge < CACHE_DURATION) {
          // Use cached result
          setDetectedExercise(cachedResultRef.current.exercise);
          setConfidence(cachedResultRef.current.confidence);
          return;
        }
      }

      setIsDetecting(true);
      setError(null);

      try {
        // Capture frame
        const frame = await captureFrame();

        if (!frame) {
          setIsDetecting(false);
          return;
        }

        // Call Vision Language Model API
        const result = await detectExercise(frame);

        // Update state
        setDetectedExercise(result.exercise);
        setConfidence(result.confidence);

        // Cache result
        cachedResultRef.current = {
          exercise: result.exercise,
          confidence: result.confidence,
          timestamp: now,
        };

        // Reset retry count on success
        retryCountRef.current = 0;
        lastDetectionTimeRef.current = now;
      } catch (err) {
        console.error("Detection error:", err);

        const errorMessage =
          err instanceof Error ? err.message : "Detection failed";

        // Retry logic
        if (retryCountRef.current < 1 && !errorMessage.includes("paused")) {
          retryCountRef.current++;
          setError("Detection failed, retrying...");
          // Will retry on next interval
        } else {
          setError(
            errorMessage.includes("paused")
              ? "Detection paused, try again soon"
              : "Detection unavailable"
          );
          retryCountRef.current = 0;
        }

        lastDetectionTimeRef.current = now;
      } finally {
        setIsDetecting(false);
      }
    };

    // Run immediately on enable
    runDetection();

    // Set up interval
    intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [videoElement, enabled, captureFrame]);

  return {
    detectedExercise,
    confidence,
    isDetecting,
    error,
  };
}
