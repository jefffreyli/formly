import type { ExerciseType, FormQuality, FormFeedback } from "@/types/exercise";

// Keypoint indices for MoveNet
export const KEYPOINT_INDICES = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
  leftKnee: 13,
  rightKnee: 14,
  leftAnkle: 15,
  rightAnkle: 16,
};

// Define keypoint interface
interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

/**
 * Calculate angle between three points (in degrees)
 */
export function calculateAngle(
  point1: Keypoint,
  point2: Keypoint,
  point3: Keypoint
): number {
  const radians =
    Math.atan2(point3.y - point2.y, point3.x - point2.x) -
    Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Calculate distance between two keypoints
 */
export function calculateDistance(point1: Keypoint, point2: Keypoint): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

/**
 * Check if keypoint has sufficient confidence
 */
export function isKeypointVisible(
  keypoint: Keypoint,
  threshold = 0.3
): boolean {
  return keypoint.score !== undefined && keypoint.score > threshold;
}

/**
 * Analyze overhead press form
 */
function analyzeOverheadPress(keypoints: Keypoint[]): FormFeedback {
  const corrections: string[] = [];
  let quality: FormQuality = "good";

  const leftShoulder = keypoints[KEYPOINT_INDICES.leftShoulder];
  const rightShoulder = keypoints[KEYPOINT_INDICES.rightShoulder];
  const leftElbow = keypoints[KEYPOINT_INDICES.leftElbow];
  const rightElbow = keypoints[KEYPOINT_INDICES.rightElbow];
  const leftWrist = keypoints[KEYPOINT_INDICES.leftWrist];
  const rightWrist = keypoints[KEYPOINT_INDICES.rightWrist];
  const leftHip = keypoints[KEYPOINT_INDICES.leftHip];
  const rightHip = keypoints[KEYPOINT_INDICES.rightHip];

  // Check if performing exercise (arms above shoulders)
  const leftArmRaised = leftWrist.y < leftShoulder.y;
  const rightArmRaised = rightWrist.y < rightShoulder.y;

  if (!leftArmRaised && !rightArmRaised) {
    return {
      quality: "needs_improvement",
      feedback: "Raise your arms overhead to perform the press.",
      corrections: ["Press your arms straight up", "Extend fully at the top"],
      isPerformingExercise: false,
    };
  }

  // Check elbow alignment (should be near 180 degrees when extended)
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  if (leftElbowAngle < 160 || rightElbowAngle < 160) {
    corrections.push("Fully extend your elbows at the top");
    quality = "needs_improvement";
  }

  // Check for back arch (hip-shoulder alignment)
  const leftTorsoAngle = Math.abs(leftHip.x - leftShoulder.x);
  const rightTorsoAngle = Math.abs(rightHip.x - rightShoulder.x);
  const avgTorsoLean = (leftTorsoAngle + rightTorsoAngle) / 2;

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const leanRatio = avgTorsoLean / shoulderWidth;

  if (leanRatio > 0.3) {
    corrections.push("Engage your core - you're arching your back");
    quality = quality === "good" ? "needs_improvement" : "poor";
  }

  // Check arm symmetry
  const armHeightDiff = Math.abs(leftWrist.y - rightWrist.y);
  const shoulderHeight = Math.abs(leftShoulder.y - rightShoulder.y);

  if (armHeightDiff > shoulderHeight * 0.2) {
    corrections.push("Keep both arms at the same height");
    quality = quality === "good" ? "needs_improvement" : quality;
  }

  // Generate feedback
  let feedback = "";
  if (quality === "good") {
    feedback = "Great form! Your press looks solid.";
    corrections.push("Keep it up!", "Nice control");
  } else if (quality === "needs_improvement") {
    feedback = "Good effort, but let's tighten up a few things.";
  } else {
    feedback = "Let's work on your form - focus on control.";
  }

  return {
    quality,
    feedback,
    corrections: corrections.slice(0, 3), // Max 3 corrections
    isPerformingExercise: true,
  };
}

/**
 * Analyze side lateral raise form
 */
function analyzeSideLateralRaise(keypoints: Keypoint[]): FormFeedback {
  const corrections: string[] = [];
  let quality: FormQuality = "good";

  const leftShoulder = keypoints[KEYPOINT_INDICES.leftShoulder];
  const rightShoulder = keypoints[KEYPOINT_INDICES.rightShoulder];
  const leftElbow = keypoints[KEYPOINT_INDICES.leftElbow];
  const rightElbow = keypoints[KEYPOINT_INDICES.rightElbow];
  const leftWrist = keypoints[KEYPOINT_INDICES.leftWrist];
  const rightWrist = keypoints[KEYPOINT_INDICES.rightWrist];

  // Check if arms are raised to sides
  const leftArmOut =
    Math.abs(leftWrist.x - leftShoulder.x) >
    Math.abs(leftWrist.y - leftShoulder.y);
  const rightArmOut =
    Math.abs(rightWrist.x - rightShoulder.x) >
    Math.abs(rightWrist.y - rightShoulder.y);

  if (!leftArmOut && !rightArmOut) {
    return {
      quality: "needs_improvement",
      feedback: "Raise your arms out to the sides.",
      corrections: ["Lift arms laterally", "Go to shoulder height"],
      isPerformingExercise: false,
    };
  }

  // Check if raised to shoulder height
  const leftAtHeight = leftWrist.y <= leftShoulder.y;
  const rightAtHeight = rightWrist.y <= rightShoulder.y;

  if (!leftAtHeight || !rightAtHeight) {
    corrections.push("Raise arms to shoulder height");
    quality = "needs_improvement";
  }

  // Check for shoulder shrugging (ears should stay visible above shoulders)
  const leftEar = keypoints[KEYPOINT_INDICES.leftEar];
  const rightEar = keypoints[KEYPOINT_INDICES.rightEar];

  if (leftEar.y > leftShoulder.y || rightEar.y > rightShoulder.y) {
    corrections.push("Relax your shoulders - don't shrug");
    quality = quality === "good" ? "needs_improvement" : "poor";
  }

  // Check elbow bend (should maintain slight bend ~160-170 degrees)
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  if (leftElbowAngle > 175 || rightElbowAngle > 175) {
    corrections.push("Keep a slight bend in your elbows");
    quality = quality === "good" ? "needs_improvement" : quality;
  }

  // Generate feedback
  let feedback = "";
  if (quality === "good") {
    feedback = "Excellent! Your lateral raises look controlled.";
    corrections.push("Perfect form", "Keep those shoulders down");
  } else if (quality === "needs_improvement") {
    feedback = "Not bad, but let's refine your technique.";
  } else {
    feedback = "Let's focus on proper form.";
  }

  return {
    quality,
    feedback,
    corrections: corrections.slice(0, 3),
    isPerformingExercise: true,
  };
}

/**
 * Analyze front lateral raise form
 */
function analyzeFrontLateralRaise(keypoints: Keypoint[]): FormFeedback {
  const corrections: string[] = [];
  let quality: FormQuality = "good";

  const leftShoulder = keypoints[KEYPOINT_INDICES.leftShoulder];
  const rightShoulder = keypoints[KEYPOINT_INDICES.rightShoulder];
  const leftWrist = keypoints[KEYPOINT_INDICES.leftWrist];
  const rightWrist = keypoints[KEYPOINT_INDICES.rightWrist];
  const nose = keypoints[KEYPOINT_INDICES.nose];

  // Check if arms are raised forward
  const leftArmForward = leftWrist.y < leftShoulder.y;
  const rightArmForward = rightWrist.y < rightShoulder.y;

  if (!leftArmForward && !rightArmForward) {
    return {
      quality: "needs_improvement",
      feedback: "Raise your arms forward to shoulder height.",
      corrections: ["Lift arms in front", "Go to shoulder height"],
      isPerformingExercise: false,
    };
  }

  // Check torso position (shouldn't lean back)
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  if (nose.y > avgShoulderY * 0.8) {
    corrections.push("Keep your torso upright - don't lean back");
    quality = "needs_improvement";
  }

  // Check symmetry
  const heightDiff = Math.abs(leftWrist.y - rightWrist.y);
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);

  if (heightDiff > shoulderWidth * 0.15) {
    corrections.push("Keep both arms at the same height");
    quality = quality === "good" ? "needs_improvement" : quality;
  }

  // Generate feedback
  let feedback = "";
  if (quality === "good") {
    feedback = "Great job! Your form is on point.";
    corrections.push("Perfect technique", "Keep it steady");
  } else if (quality === "needs_improvement") {
    feedback = "Good attempt, but let's adjust a bit.";
  } else {
    feedback = "Let's work on maintaining better form.";
  }

  return {
    quality,
    feedback,
    corrections: corrections.slice(0, 3),
    isPerformingExercise: true,
  };
}

/**
 * Analyze external rotation form
 */
function analyzeExternalRotation(keypoints: Keypoint[]): FormFeedback {
  const corrections: string[] = [];
  let quality: FormQuality = "good";

  const leftShoulder = keypoints[KEYPOINT_INDICES.leftShoulder];
  const rightShoulder = keypoints[KEYPOINT_INDICES.rightShoulder];
  const leftElbow = keypoints[KEYPOINT_INDICES.leftElbow];
  const rightElbow = keypoints[KEYPOINT_INDICES.rightElbow];
  const leftWrist = keypoints[KEYPOINT_INDICES.leftWrist];
  const rightWrist = keypoints[KEYPOINT_INDICES.rightWrist];
  const leftHip = keypoints[KEYPOINT_INDICES.leftHip];
  const rightHip = keypoints[KEYPOINT_INDICES.rightHip];

  // Check elbow position (should be at torso level, not raised)
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const torsoMidY = (avgHipY + avgShoulderY) / 2;

  const leftElbowAtSide =
    Math.abs(leftElbow.y - torsoMidY) < Math.abs(avgShoulderY - avgHipY) * 0.3;
  const rightElbowAtSide =
    Math.abs(rightElbow.y - torsoMidY) < Math.abs(avgShoulderY - avgHipY) * 0.3;

  if (!leftElbowAtSide && !rightElbowAtSide) {
    return {
      quality: "poor",
      feedback: "That looks like a bicep curl, not external rotation.",
      corrections: [
        "Pin your elbow to your side",
        "Only rotate your forearm",
        "Keep upper arm still",
      ],
      isPerformingExercise: false,
    };
  }

  // Check elbow angle (should stay around 90 degrees)
  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  if (
    Math.abs(leftElbowAngle - 90) > 30 ||
    Math.abs(rightElbowAngle - 90) > 30
  ) {
    corrections.push("Keep your elbow at 90 degrees");
    quality = "needs_improvement";
  }

  // Check if forearm is rotating (wrist should move away from body)
  const leftWristOut = leftWrist.x < leftElbow.x - 20;
  const rightWristOut = rightWrist.x > rightElbow.x + 20;

  if (!leftWristOut && !rightWristOut) {
    corrections.push("Rotate your forearm outward");
    quality = quality === "good" ? "needs_improvement" : quality;
  }

  // Generate feedback
  let feedback = "";
  if (quality === "good") {
    feedback = "Perfect! Your elbow is staying at your side.";
    corrections.push("Great rotation", "Keep that control");
  } else if (quality === "needs_improvement") {
    feedback = "Good attempt, but your elbow is drifting.";
  } else {
    feedback = "Pin that elbow to your side.";
  }

  return {
    quality,
    feedback,
    corrections: corrections.slice(0, 3),
    isPerformingExercise: leftElbowAtSide || rightElbowAtSide,
  };
}

/**
 * Main function to analyze pose based on exercise type
 */
export function analyzePoseForExercise(
  keypoints: Keypoint[],
  exerciseType: ExerciseType
): FormFeedback {
  // Check if we have valid keypoints
  if (!keypoints || keypoints.length < 17) {
    return {
      quality: "needs_improvement",
      feedback: "I can't see you clearly - adjust your camera.",
      corrections: [
        "Step back from camera",
        "Ensure good lighting",
        "Face the camera",
      ],
      isPerformingExercise: false,
    };
  }

  // Check if critical keypoints are visible
  const criticalPoints = [
    keypoints[KEYPOINT_INDICES.leftShoulder],
    keypoints[KEYPOINT_INDICES.rightShoulder],
    keypoints[KEYPOINT_INDICES.leftElbow],
    keypoints[KEYPOINT_INDICES.rightElbow],
  ];

  const allVisible = criticalPoints.every((kp) => isKeypointVisible(kp, 0.3));

  if (!allVisible) {
    return {
      quality: "needs_improvement",
      feedback: "Make sure your upper body is fully visible.",
      corrections: ["Step back from camera", "Frame yourself properly"],
      isPerformingExercise: false,
    };
  }

  // Route to appropriate analyzer
  switch (exerciseType) {
    case "overhead_press":
      return analyzeOverheadPress(keypoints);
    case "side_lateral_raise":
      return analyzeSideLateralRaise(keypoints);
    case "front_lateral_raise":
      return analyzeFrontLateralRaise(keypoints);
    case "external_rotation":
      return analyzeExternalRotation(keypoints);
    default:
      return analyzeOverheadPress(keypoints);
  }
}
