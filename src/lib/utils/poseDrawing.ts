/**
 * Utilities for drawing pose keypoints and skeleton on canvas
 * Enhanced with smoothing to reduce jitter
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

// Smoothing buffer for reducing jitter
const smoothingBuffer: Map<string, Array<{ x: number; y: number }>> = new Map();
const SMOOTHING_WINDOW = 5; // Average over last 5 frames for smoother movement

/**
 * Apply moving average smoothing to keypoint positions
 */
function smoothKeypoint(keypoint: Keypoint): Keypoint {
  if (!keypoint.name) return keypoint;

  // Get or create buffer for this keypoint
  if (!smoothingBuffer.has(keypoint.name)) {
    smoothingBuffer.set(keypoint.name, []);
  }

  const buffer = smoothingBuffer.get(keypoint.name)!;

  // Add current position to buffer
  buffer.push({ x: keypoint.x, y: keypoint.y });

  // Keep only the last N positions
  if (buffer.length > SMOOTHING_WINDOW) {
    buffer.shift();
  }

  // Calculate average position
  const avgX = buffer.reduce((sum, pos) => sum + pos.x, 0) / buffer.length;
  const avgY = buffer.reduce((sum, pos) => sum + pos.y, 0) / buffer.length;

  return {
    ...keypoint,
    x: avgX,
    y: avgY,
  };
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

  // Create a map of keypoint names to keypoints with smoothing
  const keypointMap = new Map<string, Keypoint>();
  pose.keypoints.forEach((kp) => {
    if (kp.name && kp.score >= minConfidence) {
      // Apply smoothing to reduce jitter
      const smoothedKp = smoothKeypoint(kp);
      keypointMap.set(kp.name, smoothedKp);
    }
  });

  // Define limbs/muscles as natural body segments
  const limbs = [
    // Arms (upper and lower combined as one flowing muscle)
    {
      start: "left_shoulder",
      mid: "left_elbow",
      end: "left_wrist",
      name: "left_arm",
    },
    {
      start: "right_shoulder",
      mid: "right_elbow",
      end: "right_wrist",
      name: "right_arm",
    },
    // Torso
    { start: "left_shoulder", end: "left_hip", name: "left_torso" },
    { start: "right_shoulder", end: "right_hip", name: "right_torso" },
    // Legs
    {
      start: "left_hip",
      mid: "left_knee",
      end: "left_ankle",
      name: "left_leg",
    },
    {
      start: "right_hip",
      mid: "right_knee",
      end: "right_ankle",
      name: "right_leg",
    },
  ];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw each limb as a flowing, muscular shape
  limbs.forEach((limb) => {
    const startKp = keypointMap.get(limb.start);
    const endKp = keypointMap.get(limb.end);
    const midKp = limb.mid ? keypointMap.get(limb.mid) : null;

    if (!startKp || !endKp) return;

    // Arms and legs get special flowing treatment
    if (limb.name.includes("arm") || limb.name.includes("leg")) {
      if (!midKp) return;

      // Draw as a thick, flowing limb with gradient
      const gradient = ctx.createLinearGradient(
        startKp.x,
        startKp.y,
        endKp.x,
        endKp.y
      );
      gradient.addColorStop(0, "rgba(0, 255, 150, 0.7)");
      gradient.addColorStop(0.5, "rgba(0, 255, 150, 0.9)");
      gradient.addColorStop(1, "rgba(0, 200, 255, 0.8)");

      // Outer glow
      ctx.strokeStyle = "rgba(0, 255, 150, 0.2)";
      ctx.lineWidth = 28;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0, 255, 150, 0.5)";

      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.quadraticCurveTo(midKp.x, midKp.y, endKp.x, endKp.y);
      ctx.stroke();

      // Main limb
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 20;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0, 255, 150, 0.8)";

      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.quadraticCurveTo(midKp.x, midKp.y, endKp.x, endKp.y);
      ctx.stroke();

      // Highlight (muscle definition)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 8;
      ctx.shadowBlur = 5;

      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.quadraticCurveTo(midKp.x, midKp.y, endKp.x, endKp.y);
      ctx.stroke();
    } else if (limb.name.includes("torso")) {
      // Torso as solid core
      ctx.strokeStyle = "rgba(0, 255, 150, 0.6)";
      ctx.lineWidth = 18;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0, 255, 150, 0.6)";

      ctx.beginPath();
      ctx.moveTo(startKp.x, startKp.y);
      ctx.lineTo(endKp.x, endKp.y);
      ctx.stroke();
    }
  });

  // Reset shadow
  ctx.shadowBlur = 0;

  // Draw minimal endpoint markers (hands/feet) - not joints
  const endpoints = [
    { name: "left_wrist", label: "hand" },
    { name: "right_wrist", label: "hand" },
    { name: "left_ankle", label: "foot" },
    { name: "right_ankle", label: "foot" },
  ];

  endpoints.forEach((endpoint) => {
    const kp = pose.keypoints.find((k) => k.name === endpoint.name);
    if (kp && kp.score >= minConfidence) {
      const smoothedKp = smoothKeypoint(kp);

      // Glowing endpoint
      ctx.fillStyle = "rgba(0, 255, 200, 0.3)";
      ctx.beginPath();
      ctx.arc(smoothedKp.x, smoothedKp.y, 16, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(smoothedKp.x, smoothedKp.y, 10, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 255, 200, 1)";
      ctx.beginPath();
      ctx.arc(smoothedKp.x, smoothedKp.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}
