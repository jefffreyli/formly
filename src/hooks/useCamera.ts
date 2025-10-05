"use client";

import { useState, useCallback, useEffect } from "react";

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isActive: boolean;
}

interface CameraActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export type UseCameraReturn = CameraState & CameraActions;

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Request camera access with video constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(getCameraErrorMessage(errorMessage));
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsActive(false);
    setError(null);
  }, [stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    error,
    isActive,
    startCamera,
    stopCamera,
  };
}

// Helper function to provide user-friendly error messages
function getCameraErrorMessage(error: string): string {
  if (
    error.includes("Permission denied") ||
    error.includes("NotAllowedError")
  ) {
    return "Camera access denied. Please allow camera permissions and try again.";
  }

  if (
    error.includes("NotFoundError") ||
    error.includes("DevicesNotFoundError")
  ) {
    return "No camera found. Please connect a camera and try again.";
  }

  if (error.includes("NotReadableError") || error.includes("TrackStartError")) {
    return "Camera is already in use by another application.";
  }

  if (
    error.includes("OverconstrainedError") ||
    error.includes("ConstraintNotSatisfiedError")
  ) {
    return "Camera constraints could not be satisfied.";
  }

  return "Unable to access camera. Please check your device settings.";
}
