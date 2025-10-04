import { useRef, useEffect, useState } from "react";
import { useLiveExerciseDetection } from "@/lib/hooks/useLiveExerciseDetection";
import { ExerciseDetectionOverlay } from "@/components/camera/ExerciseDetectionOverlay";

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

  // Exercise detection hook
  const { detectedExercise, confidence, isDetecting, error } =
    useLiveExerciseDetection(
      videoRef.current,
      autoDetectEnabled && stream !== null
    );

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
    <div className={`relative w-full camera-transition ${className}`}>
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
          exercise={detectedExercise}
          confidence={confidence}
          isDetecting={isDetecting}
          error={error}
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
  );
}
