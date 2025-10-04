import { useRef, useEffect, useState } from "react";
import { useRealtimeExerciseDetection } from "@/lib/hooks/useRealtimeExerciseDetection";
import { ExerciseDetectionOverlay } from "@/components/camera/ExerciseDetectionOverlay";
import {
  ExerciseSelector,
  AVAILABLE_EXERCISES,
} from "@/components/ExerciseSelector";
import type { ExerciseType } from "@/types/exercise";

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
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseType>("overhead_press");

  // Exercise detection hook with audio feedback
  const { formFeedback, isDetecting, error, audioUrl } =
    useRealtimeExerciseDetection(
      videoRef.current,
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
    }
  }, [stream]);

  const handleToggleDetection = () => {
    const newState = !autoDetectEnabled;
    setAutoDetectEnabled(newState);
    onToggleDetection?.(newState);
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
          className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none"
          style={{ maxHeight: "80vh" }}
        />

        {/* Exercise Detection Overlay */}
        {autoDetectEnabled && (
          <ExerciseDetectionOverlay
            formFeedback={formFeedback}
            isDetecting={isDetecting}
            error={error}
            exerciseName={exerciseName}
          />
        )}

        {/* Auto-Detect Toggle Button */}
        <button
          onClick={handleToggleDetection}
          className={`absolute top-4 right-4 z-10 flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-formly hover:shadow-formly-lg ${
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
  );
}
