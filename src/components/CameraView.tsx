"use client";

import { useRef, useEffect, useState } from "react";
import { usePoseExerciseDetection } from "@/lib/hooks/usePoseExerciseDetection";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { ExerciseDetectionOverlay } from "@/components/camera/ExerciseDetectionOverlay";
import {
  ExerciseSelector,
  AVAILABLE_EXERCISES,
} from "@/components/ExerciseSelector";
import type { ExerciseType } from "@/types/exercise";
import { drawPoseSkeleton } from "@/lib/utils/poseDrawing";
import { addLog } from "@/components/FeedbackLog";
import { useAudioQueue } from "@/lib/hooks/useAudioQueue";

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

  const { clearQueue } = useAudioQueue();

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

  // Get the exercise name for display
  const exerciseName =
    AVAILABLE_EXERCISES.find((ex) => ex.id === selectedExercise)?.name ||
    "Exercise";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      addLog("success", "Camera", "Camera stream connected");
    }
  }, [stream]);

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
    addLog(
      newState ? "success" : "info",
      "Detection",
      `Auto-detect ${newState ? "enabled" : "disabled"} for ${exerciseName}`,
      { exercise: selectedExercise }
    );
  };


  return (
    <div className={`relative w-full space-y-4 ${className}`}>
      {/* Main Content: Video takes full width */}
      <div className="flex flex-col gap-4 items-center">
        {/* Video Container - Takes full space */}
        <div className="relative w-full max-w-4xl camera-transition">
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

      {/* Exercise Selector */}
      <ExerciseSelector
        selectedExercise={selectedExercise}
        onExerciseChange={(exercise) => {
          setSelectedExercise(exercise);
          clearQueue(); // Clear any pending audio from previous exercise
          addLog(
            "info",
            "Exercise",
            `Exercise changed to ${
              AVAILABLE_EXERCISES.find((ex) => ex.id === exercise)?.name
            } - audio queue cleared`,
            { exerciseType: exercise }
          );
        }}
        className="max-w-md mx-auto"
      />
    </div>
  );
}
