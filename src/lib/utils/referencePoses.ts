/**
 * Reference poses for each exercise type
 * These represent "good form" at different phases of each exercise
 */

interface PoseAngles {
  leftShoulderAngle: number;
  rightShoulderAngle: number;
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftHipAngle: number;
  rightHipAngle: number;
  leftArmElevation: number;
  rightArmElevation: number;
}

/**
 * Overhead Press Reference Poses
 * Phase 1: Starting position (weights at shoulder level)
 * Phase 2: Mid-press (arms halfway up)
 * Phase 3: Lockout (arms fully extended overhead)
 */
export const OVERHEAD_PRESS_REFERENCES: PoseAngles[] = [
  // Phase 1: Starting position
  {
    leftShoulderAngle: 90, // Arms at 90 degrees to body
    rightShoulderAngle: 90,
    leftElbowAngle: 90, // Elbows bent at 90 degrees
    rightElbowAngle: 90,
    leftHipAngle: 180, // Upright torso
    rightHipAngle: 180,
    leftArmElevation: 0, // Hands at shoulder height
    rightArmElevation: 0,
  },
  // Phase 2: Mid-press
  {
    leftShoulderAngle: 120,
    rightShoulderAngle: 120,
    leftElbowAngle: 135, // Partially extended
    rightElbowAngle: 135,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 100, // Hands above shoulders
    rightArmElevation: 100,
  },
  // Phase 3: Lockout
  {
    leftShoulderAngle: 160, // Arms nearly vertical
    rightShoulderAngle: 160,
    leftElbowAngle: 170, // Nearly straight
    rightElbowAngle: 170,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 200, // Hands well above head
    rightArmElevation: 200,
  },
];

/**
 * Side Lateral Raise Reference Poses
 * Phase 1: Starting position (arms at sides)
 * Phase 2: Mid-raise (arms at 45 degrees)
 * Phase 3: Peak (arms at shoulder height, parallel to ground)
 */
export const SIDE_LATERAL_RAISE_REFERENCES: PoseAngles[] = [
  // Phase 1: Starting position
  {
    leftShoulderAngle: 30, // Arms close to body
    rightShoulderAngle: 30,
    leftElbowAngle: 160, // Slight bend in elbow
    rightElbowAngle: 160,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: -50, // Hands below shoulders
    rightArmElevation: -50,
  },
  // Phase 2: Mid-raise
  {
    leftShoulderAngle: 60, // Arms out to side at 45 degrees
    rightShoulderAngle: 60,
    leftElbowAngle: 155,
    rightElbowAngle: 155,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 25, // Hands rising
    rightArmElevation: 25,
  },
  // Phase 3: Peak
  {
    leftShoulderAngle: 90, // Arms parallel to ground
    rightShoulderAngle: 90,
    leftElbowAngle: 150, // Maintained slight bend
    rightElbowAngle: 150,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 50, // Hands at shoulder height
    rightArmElevation: 50,
  },
];

/**
 * Front Lateral Raise Reference Poses
 * Phase 1: Starting position (arms at sides)
 * Phase 2: Mid-raise (arms at 45 degrees forward)
 * Phase 3: Peak (arms at shoulder height, forward)
 */
export const FRONT_LATERAL_RAISE_REFERENCES: PoseAngles[] = [
  // Phase 1: Starting position
  {
    leftShoulderAngle: 30,
    rightShoulderAngle: 30,
    leftElbowAngle: 165,
    rightElbowAngle: 165,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: -50,
    rightArmElevation: -50,
  },
  // Phase 2: Mid-raise
  {
    leftShoulderAngle: 60,
    rightShoulderAngle: 60,
    leftElbowAngle: 160,
    rightElbowAngle: 160,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 30,
    rightArmElevation: 30,
  },
  // Phase 3: Peak
  {
    leftShoulderAngle: 90,
    rightShoulderAngle: 90,
    leftElbowAngle: 155,
    rightElbowAngle: 155,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 60,
    rightArmElevation: 60,
  },
];

/**
 * External Rotation Reference Poses
 * Phase 1: Starting position (elbow at side, forearm forward)
 * Phase 2: Mid-rotation (forearm rotating outward)
 * Phase 3: End position (forearm rotated out 90 degrees)
 */
export const EXTERNAL_ROTATION_REFERENCES: PoseAngles[] = [
  // Phase 1: Starting position
  {
    leftShoulderAngle: 45, // Elbow at side
    rightShoulderAngle: 45,
    leftElbowAngle: 90, // 90 degree elbow bend (critical!)
    rightElbowAngle: 90,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: -20, // Hand slightly below shoulder
    rightArmElevation: -20,
  },
  // Phase 2: Mid-rotation
  {
    leftShoulderAngle: 50, // Elbow stays at side
    rightShoulderAngle: 50,
    leftElbowAngle: 90, // Elbow angle MUST stay 90
    rightElbowAngle: 90,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: -10,
    rightArmElevation: -10,
  },
  // Phase 3: Full external rotation
  {
    leftShoulderAngle: 55, // Slight change, elbow still at side
    rightShoulderAngle: 55,
    leftElbowAngle: 90, // Maintained 90 degrees (KEY)
    rightElbowAngle: 90,
    leftHipAngle: 180,
    rightHipAngle: 180,
    leftArmElevation: 0, // Hand at shoulder height
    rightArmElevation: 0,
  },
];

/**
 * Get reference poses for a specific exercise type
 */
export function getReferencePosesFor(exerciseType: string): PoseAngles[] {
  switch (exerciseType) {
    case "overhead_press":
      return OVERHEAD_PRESS_REFERENCES;
    case "side_lateral_raise":
      return SIDE_LATERAL_RAISE_REFERENCES;
    case "front_lateral_raise":
      return FRONT_LATERAL_RAISE_REFERENCES;
    case "external_rotation":
      return EXTERNAL_ROTATION_REFERENCES;
    default:
      return OVERHEAD_PRESS_REFERENCES;
  }
}

/**
 * Get exercise name from similarity scores across all exercise types
 * Returns the exercise type with highest average similarity
 */
export function identifyExercise(
  currentKeypoints: Array<{
    x: number;
    y: number;
    score: number;
    name?: string;
  }>
): {
  exerciseType: string;
  confidence: number;
} | null {
  const { extractPoseAngles, comparePoses } = require("./cosineSimilarity");

  const currentAngles = extractPoseAngles(currentKeypoints);
  if (!currentAngles) return null;

  const exercises = [
    { type: "overhead_press", refs: OVERHEAD_PRESS_REFERENCES },
    { type: "side_lateral_raise", refs: SIDE_LATERAL_RAISE_REFERENCES },
    { type: "front_lateral_raise", refs: FRONT_LATERAL_RAISE_REFERENCES },
    { type: "external_rotation", refs: EXTERNAL_ROTATION_REFERENCES },
  ];

  let bestExercise = "";
  let bestScore = -1;

  exercises.forEach(({ type, refs }) => {
    // Calculate average similarity across all phases
    const similarities = refs.map((ref) => comparePoses(currentAngles, ref));
    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    if (avgSimilarity > bestScore) {
      bestScore = avgSimilarity;
      bestExercise = type;
    }
  });

  return {
    exerciseType: bestExercise,
    confidence: bestScore,
  };
}
