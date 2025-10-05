import { useState, useEffect, useRef } from "react";
import { detectExercise } from "@/lib/api/visionModel";
import { useFrameCapture } from "@/lib/hooks/useFrameCapture";
import type { FormFeedback, ExerciseType } from "@/types/exercise";

interface UseLiveExerciseDetectionReturn {
  formFeedback: FormFeedback | null;
  isDetecting: boolean;
  error: string | null;
}

// Optimized for lower latency
const DETECTION_INTERVAL = 3000; // 3 seconds between detections (faster feedback)
const CACHE_DURATION = 4000; // Cache results for 4 seconds
const MAX_RETRY_DELAY = 10000; // Maximum retry delay of 10 seconds
const CAPTURE_DURATION = 500; // Capture frames over 0.5 seconds (much faster capture)
const FRAME_COUNT = 5; // 5 frames at ~10 FPS (reduced from 30 for faster processing)

/**
 * Hook for live exercise detection from video stream
 * Optimized for low latency feedback
 * @param videoElement - The HTML video element to analyze
 * @param enabled - Whether detection is enabled
 * @param exerciseType - The type of exercise to analyze
 * @returns Detection state and results
 */
export function useLiveExerciseDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
  exerciseType: ExerciseType = "overhead_press"
): UseLiveExerciseDetectionReturn {
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { captureFrameSequence } = useFrameCapture(videoElement);

  // Refs for managing detection lifecycle
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const cachedResultRef = useRef<{
    formFeedback: FormFeedback;
    timestamp: number;
  } | null>(null);
  const retryDelayRef = useRef<number>(0);
  const rateLimitUntilRef = useRef<number>(0);

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

      // Check if we're in a rate limit cooldown period
      if (rateLimitUntilRef.current > now) {
        const remainingSeconds = Math.ceil(
          (rateLimitUntilRef.current - now) / 1000
        );
        setError(`Rate limit reached. Retry in ${remainingSeconds}s`);
        return;
      }

      // Throttle: ensure minimum time between detections
      const effectiveInterval = DETECTION_INTERVAL + retryDelayRef.current;
      if (now - lastDetectionTimeRef.current < effectiveInterval) {
        return;
      }

      // Check cache
      if (cachedResultRef.current) {
        const cacheAge = now - cachedResultRef.current.timestamp;
        if (cacheAge < CACHE_DURATION) {
          // Use cached result
          setFormFeedback(cachedResultRef.current.formFeedback);
          return;
        }
      }

      setIsDetecting(true);
      setError(null);

      try {
        // Capture sequence of frames - much faster now (0.5s instead of 6s)
        const frames = await captureFrameSequence(
          CAPTURE_DURATION,
          FRAME_COUNT
        );

        if (frames.length === 0) {
          setIsDetecting(false);
          setError("Failed to capture video frames");
          return;
        }

        console.log(
          `Captured ${frames.length} frames in ${CAPTURE_DURATION}ms`
        );

        // Call Vision Language Model API with frame sequence (using streaming for faster response)
        const startTime = Date.now();
        const result = await detectExercise(frames, exerciseType);
        const apiTime = Date.now() - startTime;

        console.log(`API response time: ${apiTime}ms`);

        // Update state
        setFormFeedback(result.formFeedback);

        // Cache result
        cachedResultRef.current = {
          formFeedback: result.formFeedback,
          timestamp: now,
        };

        // Reset retry delay on success
        retryDelayRef.current = 0;
        rateLimitUntilRef.current = 0;
        lastDetectionTimeRef.current = now;
      } catch (err) {
        console.error("Detection error:", err);

        const errorMessage =
          err instanceof Error ? err.message : "Detection failed";

        // Handle rate limit errors with exponential backoff
        if (errorMessage.includes("quota") || errorMessage.includes("paused")) {
          // Extract retry delay from error if available, otherwise use exponential backoff
          const retryMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)/i);
          const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : 60;

          rateLimitUntilRef.current = now + retrySeconds * 1000;
          setError(`Rate limit reached. Retry in ${Math.ceil(retrySeconds)}s`);
        } else {
          // For other errors, use exponential backoff
          retryDelayRef.current = Math.min(
            retryDelayRef.current + 5000,
            MAX_RETRY_DELAY
          );
          setError(errorMessage || "Detection unavailable");
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
  }, [videoElement, enabled, exerciseType, captureFrameSequence]);

  return {
    formFeedback,
    isDetecting,
    error,
  };
}
