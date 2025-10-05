"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { FormFeedback, FormQuality, ExerciseType } from "@/types/exercise";

interface ExerciseDetectionOverlayProps {
  formFeedback: FormFeedback | null;
  isDetecting: boolean;
  error: string | null;
  exerciseName: string;
}

const QUALITY_LABELS: Record<FormQuality, string> = {
  good: "GOOD",
  needs_improvement: "FAIR",
  poor: "POOR",
};

const QUALITY_COLORS: Record<
  FormQuality,
  { dot: string; bg: string; text: string }
> = {
  good: {
    dot: "bg-green-500",
    bg: "bg-green-50/90",
    text: "text-green-800",
  },
  needs_improvement: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-50/90",
    text: "text-yellow-800",
  },
  poor: {
    dot: "bg-red-500",
    bg: "bg-red-50/90",
    text: "text-red-800",
  },
};

export function ExerciseDetectionOverlay({
  formFeedback,
  isDetecting,
  error,
  exerciseName,
}: ExerciseDetectionOverlayProps) {
  // Show nothing if no feedback and not detecting/error
  if (!formFeedback && !isDetecting && !error) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Error State */}
        {error && (
          <div className="bg-red-50/95 backdrop-blur-sm rounded-xl shadow-formly-lg px-4 py-3 border border-red-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-1">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-800">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detecting State */}
        {isDetecting && !error && (
          <div className="bg-blue-50/95 backdrop-blur-sm rounded-xl shadow-formly-lg px-4 py-3 border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-800">
                  Recording movement...
                </div>
                <div className="text-xs text-blue-700 opacity-80 mt-0.5">
                  Analyzing your {exerciseName.toLowerCase()} form
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Feedback State - Simple and Bold */}
        {formFeedback && !isDetecting && !error && (
          <div
            className={`backdrop-blur-sm rounded-2xl shadow-2xl px-8 py-6 border-2 ${
              QUALITY_COLORS[formFeedback.quality].bg
            } ${
              formFeedback.quality === "good"
                ? "border-green-300"
                : formFeedback.quality === "needs_improvement"
                ? "border-yellow-300"
                : "border-red-300"
            }`}
          >
            <div className="text-center space-y-4">
              {/* Big Quality Rating */}
              <div
                className={`text-6xl font-black tracking-tight ${
                  QUALITY_COLORS[formFeedback.quality].text
                }`}
              >
                {formFeedback.isPerformingExercise
                  ? QUALITY_LABELS[formFeedback.quality]
                  : "WRONG"}
              </div>

              {/* Single Piece of Advice */}
              {formFeedback.corrections.length > 0 && (
                <div
                  className={`text-lg font-medium ${
                    QUALITY_COLORS[formFeedback.quality].text
                  } opacity-90`}
                >
                  {formFeedback.corrections[0]}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
