"use client";

import { useState, useRef, useEffect } from "react";
import type { ExerciseType, ExerciseInfo } from "@/types/exercise";

interface ExerciseSelectorProps {
  selectedExercise: ExerciseType;
  onExerciseChange: (exercise: ExerciseType) => void;
  className?: string;
}

export const AVAILABLE_EXERCISES: ExerciseInfo[] = [
  {
    id: "overhead_press",
    name: "Overhead Press",
    description: "Press arms overhead with or without weights",
  },
  {
    id: "external_rotation",
    name: "Seated Single Arm External Rotation",
    description: "Rotate arm outward while seated",
  },
];

export function ExerciseSelector({
  selectedExercise,
  onExerciseChange,
  className = "",
}: ExerciseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedExerciseInfo = AVAILABLE_EXERCISES.find(
    (ex) => ex.id === selectedExercise
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (exercise: ExerciseType) => {
    onExerciseChange(exercise);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/90 hover:bg-white backdrop-blur-sm rounded-xl shadow-formly hover:shadow-formly-lg transition-all duration-200 text-left"
      >
        <div className="flex-1 min-w-0 mr-3">
          <div className="text-sm font-semibold text-foreground-primary truncate">
            {selectedExerciseInfo?.name}
          </div>
          <div className="text-xs text-foreground-secondary truncate mt-0.5">
            {selectedExerciseInfo?.description}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-foreground-secondary transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-formly-lg overflow-hidden z-50 animate-fade-in">
          {AVAILABLE_EXERCISES.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => handleSelect(exercise.id)}
              className={`w-full px-4 py-3 text-left transition-colors duration-150 ${
                exercise.id === selectedExercise
                  ? "bg-accent-primary/10 border-l-4 border-accent-primary"
                  : "hover:bg-background-secondary border-l-4 border-transparent"
              }`}
            >
              <div className="text-sm font-semibold text-foreground-primary">
                {exercise.name}
              </div>
              <div className="text-xs text-foreground-secondary mt-0.5">
                {exercise.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

