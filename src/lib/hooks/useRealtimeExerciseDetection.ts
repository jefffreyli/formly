import { useState, useEffect, useRef } from "react";
import { useFrameCapture } from "@/lib/hooks/useFrameCapture";
import { analyzeVideoToText, textToSpeech } from "@/lib/api/sessionService";
import { generateSpeechText } from "@/lib/utils/feedbackUtils";
import type { FormFeedback, ExerciseType } from "@/types/exercise";

interface UseRealtimeExerciseDetectionReturn {
  formFeedback: FormFeedback | null;
  isDetecting: boolean;
  error: string | null;
  audioUrl: string | null;
}

const DETECTION_INTERVAL = 10000; // 10 seconds between detections
const CAPTURE_DURATION = 6000; // Capture frames over 6 seconds
const FRAME_COUNT = 10; // Number of frames to capture

/**
 * Hook for real-time exercise detection with audio feedback
 *
 * @param videoElement - The HTML video element to analyze
 * @param enabled - Whether detection is enabled
 * @param exerciseType - The type of exercise to analyze
 * @returns Detection state and results
 */
export function useRealtimeExerciseDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
  exerciseType: ExerciseType = "overhead_press"
): UseRealtimeExerciseDetectionReturn {
  const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const { captureFrameSequence } = useFrameCapture(videoElement);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !videoElement) {
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
      setIsDetecting(true);
      setError(null);

      try {
        // Step 1: Capture frames
        const frames = await captureFrameSequence(
          CAPTURE_DURATION,
          FRAME_COUNT
        );

        if (frames.length === 0) {
          setIsDetecting(false);
          setError("Failed to capture video frames");
          return;
        }

        // Step 2: Analyze video to get text feedback
        const analysisResult = await analyzeVideoToText(frames, exerciseType);

        if (!analysisResult.success || !analysisResult.formFeedback) {
          setError(analysisResult.error || "Analysis failed");
          return;
        }

        setFormFeedback(analysisResult.formFeedback);

        // Step 3: Convert feedback to speech if performing exercise
        if (analysisResult.formFeedback.isPerformingExercise) {
          const speechText = generateSpeechText(analysisResult.formFeedback);
          const ttsResult = await textToSpeech(speechText);

          if (ttsResult.success && ttsResult.audioUrl) {
            setAudioUrl(ttsResult.audioUrl);

            // Auto-play audio
            if (!audioRef.current) {
              audioRef.current = new Audio();
            }
            audioRef.current.src = ttsResult.audioUrl;
            audioRef.current.play().catch((err) => {
              console.error("Failed to play audio:", err);
            });
          }
        }
      } catch (err) {
        console.error("Detection error:", err);
        setError(err instanceof Error ? err.message : "Detection failed");
      } finally {
        setIsDetecting(false);
      }
    };

    // Run immediately on enable
    runDetection();

    // Set up interval for continuous detection
    intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [videoElement, enabled, exerciseType, captureFrameSequence]);

  return {
    formFeedback,
    isDetecting,
    error,
    audioUrl,
  };
}
