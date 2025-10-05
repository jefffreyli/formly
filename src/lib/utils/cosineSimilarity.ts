/**
 * Cosine similarity utilities for pose comparison
 * Based on joint angle vectors for robust pose matching
 */

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface PoseAngles {
  // Shoulder angles
  leftShoulderAngle: number;
  rightShoulderAngle: number;

  // Elbow angles
  leftElbowAngle: number;
  rightElbowAngle: number;

  // Hip angles (for torso position)
  leftHipAngle: number;
  rightHipAngle: number;

  // Arm elevation (how high arms are relative to shoulders)
  leftArmElevation: number;
  rightArmElevation: number;
}

/**
 * Calculate angle between three points (in degrees)
 * @param point1 - First point (e.g., shoulder)
 * @param point2 - Middle point (e.g., elbow) - vertex of angle
 * @param point3 - Third point (e.g., wrist)
 */
function calculateAngle(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  const radians =
    Math.atan2(point3.y - point2.y, point3.x - point2.x) -
    Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Extract key joint angles from pose keypoints
 */
export function extractPoseAngles(keypoints: Keypoint[]): PoseAngles | null {
  // Create keypoint map
  const kpMap = new Map<string, Keypoint>();
  keypoints.forEach((kp) => {
    if (kp.name && kp.score > 0.3) {
      kpMap.set(kp.name, kp);
    }
  });

  // Get required keypoints
  const leftShoulder = kpMap.get("left_shoulder");
  const rightShoulder = kpMap.get("right_shoulder");
  const leftElbow = kpMap.get("left_elbow");
  const rightElbow = kpMap.get("right_elbow");
  const leftWrist = kpMap.get("left_wrist");
  const rightWrist = kpMap.get("right_wrist");
  const leftHip = kpMap.get("left_hip");
  const rightHip = kpMap.get("right_hip");

  // Return null if critical keypoints are missing
  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftElbow ||
    !rightElbow ||
    !leftWrist ||
    !rightWrist
  ) {
    return null;
  }

  return {
    // Elbow angles (angle at elbow joint)
    leftElbowAngle: calculateAngle(leftShoulder, leftElbow, leftWrist),
    rightElbowAngle: calculateAngle(rightShoulder, rightElbow, rightWrist),

    // Shoulder angles (angle between torso and upper arm)
    leftShoulderAngle: leftHip
      ? calculateAngle(leftHip, leftShoulder, leftElbow)
      : calculateAngle(
          { x: leftShoulder.x, y: leftShoulder.y + 100 },
          leftShoulder,
          leftElbow
        ),
    rightShoulderAngle: rightHip
      ? calculateAngle(rightHip, rightShoulder, rightElbow)
      : calculateAngle(
          { x: rightShoulder.x, y: rightShoulder.y + 100 },
          rightShoulder,
          rightElbow
        ),

    // Hip angles (torso alignment)
    leftHipAngle: leftHip
      ? calculateAngle(leftShoulder, leftHip, {
          x: leftHip.x,
          y: leftHip.y + 100,
        })
      : 180,
    rightHipAngle: rightHip
      ? calculateAngle(rightShoulder, rightHip, {
          x: rightHip.x,
          y: rightHip.y + 100,
        })
      : 180,

    // Arm elevation (vertical position of wrist relative to shoulder)
    leftArmElevation: leftShoulder.y - leftWrist.y, // Positive = arm raised
    rightArmElevation: rightShoulder.y - rightWrist.y,
  };
}

/**
 * Convert pose angles to a normalized vector for cosine similarity
 */
function anglesToVector(angles: PoseAngles): number[] {
  return [
    angles.leftShoulderAngle / 180.0, // Normalize to 0-1
    angles.rightShoulderAngle / 180.0,
    angles.leftElbowAngle / 180.0,
    angles.rightElbowAngle / 180.0,
    angles.leftHipAngle / 180.0,
    angles.rightHipAngle / 180.0,
    Math.min(angles.leftArmElevation / 200.0, 1.0), // Normalize elevation
    Math.min(angles.rightArmElevation / 200.0, 1.0),
  ];
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (mag1 * mag2);
}

/**
 * Compare two poses using cosine similarity
 * @param pose1 - First pose angles
 * @param pose2 - Second pose angles
 * @returns Similarity score between 0 and 1 (1 = perfect match)
 */
export function comparePoses(pose1: PoseAngles, pose2: PoseAngles): number {
  const vec1 = anglesToVector(pose1);
  const vec2 = anglesToVector(pose2);

  const similarity = cosineSimilarity(vec1, vec2);

  // Convert from [-1, 1] to [0, 1] scale
  return (similarity + 1) / 2;
}

/**
 * Compare current pose to a reference pose and return similarity score
 * @param currentKeypoints - Current pose keypoints
 * @param referenceAngles - Reference pose angles to compare against
 * @returns Similarity score between 0 and 1, or null if pose can't be extracted
 */
export function comparePoseToReference(
  currentKeypoints: Keypoint[],
  referenceAngles: PoseAngles
): number | null {
  const currentAngles = extractPoseAngles(currentKeypoints);

  if (!currentAngles) {
    return null;
  }

  return comparePoses(currentAngles, referenceAngles);
}

/**
 * Find the best matching reference pose from a set
 * @param currentKeypoints - Current pose keypoints
 * @param referencePoses - Array of reference poses to compare against
 * @returns Best match with similarity score and index, or null
 */
export function findBestMatch(
  currentKeypoints: Keypoint[],
  referencePoses: PoseAngles[]
): { similarity: number; index: number } | null {
  const currentAngles = extractPoseAngles(currentKeypoints);

  if (!currentAngles) {
    return null;
  }

  let bestSimilarity = -1;
  let bestIndex = -1;

  referencePoses.forEach((refPose, index) => {
    const similarity = comparePoses(currentAngles, refPose);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestIndex = index;
    }
  });

  if (bestIndex === -1) {
    return null;
  }

  return {
    similarity: bestSimilarity,
    index: bestIndex,
  };
}
