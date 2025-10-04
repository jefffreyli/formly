import { NextResponse } from "next/server";
import type { ExerciseInfo } from "@/types/exercise";

/**
 * GET /api/exercises
 * Returns the list of available exercises
 */
export async function GET() {
  const exercises: ExerciseInfo[] = [
    {
      id: "overhead_press",
      name: "Overhead Press",
      description:
        "A shoulder strengthening exercise where you press weight overhead from shoulder height to full arm extension.",
    },
    {
      id: "external_rotation",
      name: "External Rotation",
      description:
        "A rotator cuff exercise where you rotate your forearm outward while keeping your elbow at your side.",
    },
  ];

  return NextResponse.json({
    exercises,
  });
}
