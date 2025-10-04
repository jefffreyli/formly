"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ExerciseType, ConfidenceLevel } from "@/types/exercise";

interface ExerciseDetectionOverlayProps {
  exercise: ExerciseType | null;
  confidence: ConfidenceLevel | null;
  isDetecting: boolean;
  error: string | null;
}

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squat: "Squat",
  lunge: "Lunge",
  shoulder_press: "Shoulder Press",
  leg_raise: "Leg Raise",
  plank: "Plank",
  push_up: "Push-up",
  bicep_curl: "Bicep Curl",
  none: "No Exercise",
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

const CONFIDENCE_COLORS: Record<
  ConfidenceLevel,
  { dot: string; text: string }
> = {
  high: { dot: "bg-green-500", text: "text-green-700" },
  medium: { dot: "bg-yellow-500", text: "text-yellow-700" },
  low: { dot: "bg-red-500", text: "text-red-700" },
};

export function ExerciseDetectionOverlay({
  exercise,
  confidence,
  isDetecting,
  error,
}: ExerciseDetectionOverlayProps) {
  // Determine display state
  let statusDot = "bg-gray-400";
  let statusText = "Ready to detect";
  let statusSubtext = "";

  if (error) {
    statusDot = "bg-red-500";
    statusText = error;
  } else if (isDetecting) {
    statusDot = "bg-blue-500";
    statusText = "Detecting...";
  } else if (exercise && confidence) {
    const colors = CONFIDENCE_COLORS[confidence];
    statusDot = colors.dot;
    statusText = EXERCISE_LABELS[exercise];
    statusSubtext = CONFIDENCE_LABELS[confidence];
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="absolute top-4 left-4 z-10 bg-background-primary/90 backdrop-blur-sm rounded-xl shadow-formly-lg px-4 py-3 min-w-[200px]"
      >
        <div className="flex items-start space-x-3">
          {/* Status Dot */}
          <div className="flex-shrink-0 pt-1">
            {isDetecting ? (
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            ) : (
              <div className={`w-3 h-3 ${statusDot} rounded-full`} />
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground-primary truncate">
              {statusText}
            </div>
            {statusSubtext && (
              <div
                className={`text-xs mt-0.5 ${
                  confidence && CONFIDENCE_COLORS[confidence].text
                }`}
              >
                {statusSubtext}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
