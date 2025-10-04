import { useState, useCallback } from "react";
import { videoToBase64 } from "@/lib/utils/imageProcessing";

interface UseFrameCaptureReturn {
  captureFrame: () => Promise<string | null>;
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

  return {
    captureFrame,
    isCapturing,
  };
}
