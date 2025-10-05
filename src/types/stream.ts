/**
 * Type definitions for video streaming
 */

export interface VideoFrameMessage {
  type: "video-frame";
  sessionId: string;
  frame: string; // base64 JPEG data
  width: number;
  height: number;
  timestamp: number;
  frameNumber: number;
  quality: number;
}

export interface PoseOverlayMessage {
  type: "pose-overlay";
  sessionId: string;
  keypoints: Array<{
    x: number;
    y: number;
    confidence: number;
    label?: string;
  }>;
  timestamp: number;
}

export interface StreamControlMessage {
  type: "stream-control";
  sessionId: string;
  command: "start" | "stop" | "adjust-quality" | "pause" | "resume";
  quality?: number;
  fps?: number;
  timestamp: number;
}

export interface StreamMetadataMessage {
  type: "stream-metadata";
  sessionId: string;
  status: "started" | "stopped" | "paused";
  viewers: number;
  timestamp: number;
}

export type StreamMessage =
  | VideoFrameMessage
  | PoseOverlayMessage
  | StreamControlMessage
  | StreamMetadataMessage;

export interface StreamSettings {
  enabled: boolean;
  fps: number; // Target frames per second (10-30)
  quality: number; // JPEG quality (40-90)
  width: number; // Target width
  height: number; // Target height
  adaptiveQuality: boolean; // Auto-adjust quality based on bandwidth
}

export const DEFAULT_STREAM_SETTINGS: StreamSettings = {
  enabled: false,
  fps: 15, // 15 FPS is good balance
  quality: 70, // 70% JPEG quality
  width: 640,
  height: 480,
  adaptiveQuality: true,
};

