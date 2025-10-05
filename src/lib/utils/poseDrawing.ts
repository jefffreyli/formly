/**
 * Utilities for drawing pose keypoints and skeleton on canvas
 */

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface Pose {
  keypoints: Keypoint[];
  score: number;
}

// MoveNet keypoint connections (skeleton)
const POSE_CONNECTIONS = [
  // Face
  ["nose", "left_eye"],
  ["nose", "right_eye"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],

  // Torso
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],

  // Left arm
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],

  // Right arm
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],

  // Left leg
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],

  // Right leg
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/**
 * Draws pose skeleton on a canvas
 * @param ctx - Canvas 2D context
 * @param pose - Pose with keypoints
 * @param videoWidth - Width of the video element
 * @param videoHeight - Height of the video element
 * @param minConfidence - Minimum confidence score to draw keypoint (default 0.3)
 */
export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  videoWidth: number,
  videoHeight: number,
  minConfidence: number = 0.3
): void {
  if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
    return;
  }

  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Set canvas size to match video
  ctx.canvas.width = videoWidth;
  ctx.canvas.height = videoHeight;

  // Create a map of keypoint names to keypoints for easy lookup
  const keypointMap = new Map<string, Keypoint>();
  pose.keypoints.forEach((kp) => {
    if (kp.name && kp.score >= minConfidence) {
      keypointMap.set(kp.name, kp);
    }
  });

  // Draw connections (skeleton lines)
  ctx.strokeStyle = "#00FF00";
  ctx.lineWidth = 3;
  POSE_CONNECTIONS.forEach(([start, end]) => {
    const startKp = keypointMap.get(start);
    const endKp = keypointMap.get(end);

    if (startKp && endKp) {
      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.lineTo(endKp.x, endKp.y);
      ctx.stroke();
    }
  });

  // Draw keypoints (dots)
  pose.keypoints.forEach((kp) => {
    if (kp.score >= minConfidence) {
      // Keypoint color based on confidence
      const alpha = Math.min(kp.score, 1.0);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;

      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}
