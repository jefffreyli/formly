"use client";

import { useRef, useEffect, useState } from "react";
import { usePoseExerciseDetection } from "@/lib/hooks/usePoseExerciseDetection";
import { useVideoStream } from "@/lib/hooks/useVideoStream";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { getOrCreateSessionId } from "@/lib/api/sessionService";
import { ExerciseDetectionOverlay } from "@/components/camera/ExerciseDetectionOverlay";
import {
  ExerciseSelector,
  AVAILABLE_EXERCISES,
} from "@/components/ExerciseSelector";
import type { ExerciseType } from "@/types/exercise";
import { drawPoseSkeleton } from "@/lib/utils/poseDrawing";

interface CameraViewProps {
  stream: MediaStream | null;
  className?: string;
  onToggleDetection?: (enabled: boolean) => void;
}

export function CameraView({
  stream,
  className = "",
  onToggleDetection,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseType>("overhead_press");
  const [sessionId] = useState(() => getOrCreateSessionId());

  // Enhanced pose detection with TensorFlow.js repository patterns
  // Always enable pose detection when camera is active
  const {
    pose,
    isProcessing,
    error: poseError,
    fps,
    isInitialized,
    startDetection,
    stopDetection,
  } = usePoseDetection(videoRef.current, stream !== null, {
    modelType: "MoveNet",
    enableSmoothing: true,
    enableSegmentation: false,
    minPoseScore: 0.25,
  });

  // Exercise detection hook with audio feedback - uses POSE DATA (fast!)
  const { formFeedback, isDetecting, error, audioUrl } =
    usePoseExerciseDetection(
      pose,
      autoDetectEnabled && stream !== null,
      selectedExercise
    );

  // Video streaming hook - automatically streams when camera is active
  const {
    isStreaming,
    streamError,
    frameCount,
    currentFPS,
    startStream,
    stopStream,
  } = useVideoStream(videoRef.current, sessionId, {
    fps: 15,
    quality: 70,
  });

  // Get the exercise name for display
  const exerciseName =
    AVAILABLE_EXERCISES.find((ex) => ex.id === selectedExercise)?.name ||
    "Exercise";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      // Auto-start streaming when camera is active
      if (!isStreaming) {
        startStream();
      }
    } else if (!stream && isStreaming) {
      // Stop streaming when camera is turned off
      stopStream();
    }
  }, [stream, isStreaming, startStream, stopStream]);

  // Draw pose skeleton on canvas
  useEffect(() => {
    if (!pose || !videoRef.current || !canvasRef.current) {
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;

    // Draw skeleton
    drawPoseSkeleton(ctx, pose, video.videoWidth, video.videoHeight);
  }, [pose]);

  const handleToggleDetection = () => {
    const newState = !autoDetectEnabled;
    setAutoDetectEnabled(newState);
    onToggleDetection?.(newState);
  };

  const handleToggleStream = () => {
    if (isStreaming) {
      stopStream();
    } else {
      startStream();
    }
  };

  return (
    <div className={`relative w-full space-y-4 ${className}`}>
      {/* Exercise Selector */}
      <ExerciseSelector
        selectedExercise={selectedExercise}
        onExerciseChange={setSelectedExercise}
        className="max-w-md mx-auto"
      />

      {/* Video Container */}
      <div className="relative w-full camera-transition">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto rounded-2xl shadow-formly-lg animate-fade-in"
          style={{ maxHeight: "80vh" }}
        />

        {/* Skeleton overlay canvas - positioned over video */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none"
          style={{ maxHeight: "80vh" }}
        />

        {/* Stream LIVE Indicator - Top Left */}
        <div className="absolute top-4 left-4 z-10 space-y-2">
          <button
            onClick={handleToggleStream}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-formly hover:shadow-formly-lg ${
              isStreaming
                ? "bg-red-500 text-white"
                : "bg-white/90 text-foreground-primary hover:bg-white"
            } backdrop-blur-sm`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isStreaming ? "bg-white animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-sm">Stream:</span>
            <span className="text-sm font-semibold">
              {isStreaming ? "LIVE" : "OFF"}
            </span>
          </button>

          {/* Pose Detection Status - Real-time, instant feedback */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-formly">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isInitialized
                    ? "bg-green-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                Pose Detection:
              </span>
              <span className="text-sm font-semibold">
                {isInitialized ? "ACTIVE" : "OFF"}
              </span>
            </div>
            {isInitialized && (
              <div className="mt-1 text-xs text-gray-600">
                <div>Model: MoveNet Lightning</div>
                <div>FPS: {fps}</div>
                <div>Keypoints: {pose?.keypoints?.length || 0}</div>
              </div>
            )}
          </div>

          {/* Stream Error */}
          {streamError && (
            <div className="mt-2 bg-red-500/90 text-white text-xs px-3 py-2 rounded-xl backdrop-blur-sm">
              {streamError}
            </div>
          )}
        </div>

        {/* Exercise Detection Overlay - Bottom Right */}
        {autoDetectEnabled && (
          <div className="absolute bottom-4 right-4 z-10">
            <ExerciseDetectionOverlay
              formFeedback={formFeedback}
              isDetecting={isDetecting}
              error={error}
              exerciseName={exerciseName}
            />
          </div>
        )}

        {/* Auto-Detect Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleToggleDetection}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-formly hover:shadow-formly-lg ${
              autoDetectEnabled
                ? "bg-accent-primary text-white"
                : "bg-white/90 text-foreground-primary hover:bg-white"
            } backdrop-blur-sm`}
          >
            <span className="text-sm">Auto-Detect:</span>
            <span className="text-sm font-semibold">
              {autoDetectEnabled ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
