"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("PoseDetection");

// Define Pose interface based on TensorFlow.js pose detection output
// Following the official TensorFlow.js repository patterns
interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface Pose {
  keypoints: Keypoint[];
  score: number;
  keypoints3D?: Keypoint[];
  segmentation?: {
    maskValueToLabel: (value: number) => string;
    mask: any;
  };
}

interface PoseDetectionConfig {
  modelType?: "MoveNet" | "BlazePose" | "PoseNet";
  enableSmoothing?: boolean;
  enableSegmentation?: boolean;
  minPoseScore?: number;
}

interface PoseDetectionState {
  pose: Pose | null;
  isProcessing: boolean;
  error: string | null;
  fps: number;
  isInitialized: boolean;
}

interface PoseDetectionActions {
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  reset: () => void;
}

export type UsePoseDetectionReturn = PoseDetectionState & PoseDetectionActions;

/**
 * Hook for real-time pose detection using TensorFlow.js
 * Based on official TensorFlow.js repository patterns
 * @param videoElement - The video element to analyze
 * @param enabled - Whether detection is enabled
 * @param config - Configuration options for pose detection
 */
export function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean,
  config: PoseDetectionConfig = {}
): UsePoseDetectionReturn {
  const {
    modelType = "MoveNet",
    enableSmoothing = true,
    enableSegmentation = false,
    minPoseScore = 0.25,
  } = config;

  const [pose, setPose] = useState<Pose | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  /**
   * Load and initialize the pose detection model
   * Following TensorFlow.js repository patterns
   */
  const loadModel =
    useCallback(async (): Promise<poseDetection.PoseDetector> => {
      logger.info("Initializing TensorFlow.js backend");
      // Initialize TensorFlow.js backend
      await tf.ready();

      // Set backend to webgl (more widely supported than webgpu)
      await tf.setBackend('webgl');
      logger.info("TensorFlow.js backend ready", { backend: "webgl" });

      let detector: poseDetection.PoseDetector;

      logger.info("Loading pose detection model", {
        model: modelType,
        enableSmoothing,
        minPoseScore,
      });

      switch (modelType) {
        case "MoveNet":
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
              modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
              enableSmoothing,
              minPoseScore,
            }
          );
          break;

        case "BlazePose":
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.BlazePose,
            {
              runtime: "tfjs",
              enableSmoothing,
              enableSegmentation,
              modelType: "full",
            }
          );
          break;

        case "PoseNet":
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.PoseNet,
            {
              architecture: "MobileNetV1",
              outputStride: 16,
              inputResolution: { width: 257, height: 257 },
              multiplier: 0.75,
            }
          );
          break;

        default:
          throw new Error(`Unsupported model type: ${modelType}`);
      }

      logger.info("Pose detection model loaded successfully");

      return detector;
    }, [modelType, enableSmoothing, enableSegmentation, minPoseScore]);

  /**
   * Initialize the pose detection model
   */
  const startDetection = useCallback(async () => {
    if (!videoElement) {
      setError("No video element provided");
      return;
    }

    if (detectorRef.current) {
      console.log("Detector already initialized");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log(`Initializing ${modelType} detector...`);

      // Load model based on configuration
      const detector = await loadModel();
      detectorRef.current = detector;

      console.log(`✓ ${modelType} detector initialized`);
      setIsInitialized(true);

      // Start detection loop
      detectPose();
    } catch (err) {
      console.error("Failed to initialize pose detector:", err);
      setError(
        `Failed to load ${modelType} model: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setIsProcessing(false);
    }
  }, [videoElement, modelType, loadModel]);

  /**
   * Main pose detection loop
   */
  const detectPose = useCallback(async () => {
    if (!detectorRef.current || !videoElement || !enabled) {
      return;
    }

    try {
      // Check if video is ready
      if (videoElement.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectPose);
        return;
      }

      // Detect pose
      const poses = await detectorRef.current.estimatePoses(videoElement, {
        flipHorizontal: false,
      });

      // Update pose state
      if (poses && poses.length > 0) {
        setPose(poses[0] as Pose);
        setError(null);
      } else {
        setPose(null);
      }

      // Update FPS counter
      fpsCounterRef.current.frames++;
      const now = Date.now();
      const elapsed = now - fpsCounterRef.current.lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((fpsCounterRef.current.frames * 1000) / elapsed));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(detectPose);
    } catch (err) {
      console.error("Pose detection error:", err);
      setError("Pose detection failed");
      // Continue loop even on error
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }
  }, [videoElement, enabled]);

  /**
   * Stop pose detection and cleanup
   */
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }

    setPose(null);
    setIsProcessing(false);
    setFps(0);
    setIsInitialized(false);
    console.log("Pose detection stopped");
  }, []);

  /**
   * Reset pose detection state
   */
  const reset = useCallback(() => {
    stopDetection();
    setError(null);
  }, [stopDetection]);

  // Auto-start/stop detection based on enabled state
  useEffect(() => {
    if (enabled && videoElement) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => {
      stopDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, videoElement]);

  return {
    pose,
    isProcessing,
    error,
    fps,
    isInitialized,
    startDetection,
    stopDetection,
    reset,
  };
}
