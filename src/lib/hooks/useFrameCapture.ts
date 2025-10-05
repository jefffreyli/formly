"use client";

import { useState, useCallback } from "react";
import { videoToBase64 } from "@/lib/utils/imageProcessing";

interface UseFrameCaptureReturn {
  captureFrame: () => Promise<string | null>;
  captureFrameSequence: (
    durationMs: number,
    frameCount: number
  ) => Promise<string[]>;
  isCapturing: boolean;
}

/**
 * Hook for capturing video frames as base64 images
 * @param videoElement - The HTML video element to capture from
 * @returns Object with captureFrame function and isCapturing state
 */
export function useFrameCapture(
  videoElement: HTMLVideoElement | null
): UseFrameCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoElement) {
      console.warn("Video element not available for capture");
      return null;
    }

    if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
      console.warn("Video not ready for capture");
      return null;
    }

    setIsCapturing(true);

    try {
      const base64Frame = await videoToBase64(videoElement);
      return base64Frame;
    } catch (error) {
      console.error("Failed to capture frame:", error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [videoElement]);

  /**
   * Captures a sequence of frames over a specified duration
   * @param durationMs - Total duration to capture frames (in milliseconds)
   * @param frameCount - Number of frames to capture
   * @returns Array of base64-encoded frames
   */
  const captureFrameSequence = useCallback(
    async (durationMs: number, frameCount: number): Promise<string[]> => {
      if (!videoElement) {
        console.warn("Video element not available for capture");
        return [];
      }

      if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
        console.warn("Video not ready for capture");
        return [];
      }

      setIsCapturing(true);

      try {
        const frames: string[] = [];
        const intervalMs = durationMs / (frameCount - 1);

        for (let i = 0; i < frameCount; i++) {
          try {
            const frame = await videoToBase64(videoElement);
            if (frame) frames.push(frame);

            // Wait before capturing next frame (except for the last one)
            if (i < frameCount - 1) {
              await new Promise((resolve) => setTimeout(resolve, intervalMs));
            }
          } catch (error) {
            console.error(`Failed to capture frame ${i + 1}:`, error);
          }
        }

        return frames;
      } catch (error) {
        console.error("Failed to capture frame sequence:", error);
        return [];
      } finally {
        setIsCapturing(false);
      }
    },
    [videoElement]
  );

  return {
    captureFrame,
    captureFrameSequence,
    isCapturing,
  };
}
