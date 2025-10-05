"use client";

import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingView } from "@/components/LandingView";
import { CameraView } from "@/components/CameraView";
import { CameraControls } from "@/components/CameraControls";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useCamera } from "@/hooks/useCamera";
import { usePoseDetection } from "@/hooks/usePoseDetection";

export default function Home() {
  const { stream, error, isActive, startCamera, stopCamera } = useCamera();
  const { startDetection, stopDetection, isInitialized, fps } =
    usePoseDetection(
      null, // videoElement will be set by CameraView
      false, // enabled will be controlled by CameraView
      {
        modelType: "MoveNet", // Fast and lightweight for real-time
        enableSmoothing: true,
        enableSegmentation: false,
        minPoseScore: 0.25,
      }
    );
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCamera = async () => {
    setIsLoading(true);
    try {
      await startCamera();
      if (!error) {
        startDetection();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    stopDetection();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen gradient-formly">
        {!isActive ? (
          // State 1: Camera Off (Landing View)
          <LandingView
            onStartCamera={handleStartCamera}
            isLoading={isLoading}
          />
        ) : (
          // State 2: Camera On
          <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
            {error ? (
              <ErrorMessage
                error={error}
                onRetry={handleStartCamera}
                className="mt-20"
              />
            ) : (
              <div className="w-full max-w-6xl">
                <CameraView stream={stream} />
                <CameraControls onStopCamera={handleStopCamera} />
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
