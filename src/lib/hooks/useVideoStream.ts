"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Ably from "ably";
import type { VideoFrameMessage, StreamSettings } from "@/types/stream";
import { DEFAULT_STREAM_SETTINGS } from "@/types/stream";

interface UseVideoStreamReturn {
  isStreaming: boolean;
  streamError: string | null;
  frameCount: number;
  currentFPS: number;
  startStream: () => void;
  stopStream: () => void;
  updateSettings: (settings: Partial<StreamSettings>) => void;
}

/**
 * Hook for streaming video frames to Ably in real-time
 *
 * @param videoElement - The HTML video element to stream from
 * @param sessionId - The unique session identifier for the stream channel
 * @param initialSettings - Initial streaming settings
 * @returns Stream state and controls
 */
export function useVideoStream(
  videoElement: HTMLVideoElement | null,
  sessionId: string | null,
  initialSettings: Partial<StreamSettings> = {}
): UseVideoStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [currentFPS, setCurrentFPS] = useState(0);
  const [settings, setSettings] = useState<StreamSettings>({
    ...DEFAULT_STREAM_SETTINGS,
    ...initialSettings,
  });

  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounterRef = useRef(0);
  const fpsCounterRef = useRef(0);
  const lastFPSUpdateRef = useRef(Date.now());

  /**
   * Captures and compresses a single frame from video
   */
  const captureAndCompressFrame = useCallback(
    (video: HTMLVideoElement): string | null => {
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        return null;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = settings.width;
        canvas.height = settings.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Draw video frame to canvas (scaled to target size)
        ctx.drawImage(video, 0, 0, settings.width, settings.height);

        // Convert to JPEG with specified quality
        const dataUrl = canvas.toDataURL("image/jpeg", settings.quality / 100);
        const base64Data = dataUrl.split(",")[1];

        canvas.remove();
        return base64Data;
      } catch (error) {
        console.error("Failed to capture frame:", error);
        return null;
      }
    },
    [settings.width, settings.height, settings.quality]
  );

  /**
   * Publishes a frame to Ably channel
   */
  const publishFrame = useCallback(
    async (frameData: string) => {
      if (!channelRef.current || !sessionId) return;

      const message: VideoFrameMessage = {
        type: "video-frame",
        sessionId,
        frame: frameData,
        width: settings.width,
        height: settings.height,
        timestamp: Date.now(),
        frameNumber: frameCounterRef.current++,
        quality: settings.quality,
      };

      try {
        await channelRef.current.publish("video-frame", message);
        setFrameCount(frameCounterRef.current);

        // Update FPS counter
        fpsCounterRef.current++;
        const now = Date.now();
        if (now - lastFPSUpdateRef.current >= 1000) {
          setCurrentFPS(fpsCounterRef.current);
          fpsCounterRef.current = 0;
          lastFPSUpdateRef.current = now;
        }
      } catch (error) {
        console.error("Failed to publish frame:", error);
        setStreamError("Failed to publish frame");
      }
    },
    [sessionId, settings.width, settings.height, settings.quality]
  );

  /**
   * Main streaming loop
   */
  const streamLoop = useCallback(() => {
    if (!videoElement || !isStreaming) return;

    const frameData = captureAndCompressFrame(videoElement);
    if (frameData) {
      publishFrame(frameData);
    }
  }, [videoElement, isStreaming, captureAndCompressFrame, publishFrame]);

  /**
   * Starts the video stream
   */
  const startStream = useCallback(async () => {
    if (!sessionId || !videoElement) {
      setStreamError("Missing session ID or video element");
      return;
    }

    try {
      setStreamError(null);

      // Get auth token from server
      const authResponse = await fetch("/api/ably/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!authResponse.ok) {
        throw new Error("Failed to authenticate with Ably");
      }

      const tokenRequest = await authResponse.json();

      // Create Ably Realtime client
      const ably = new Ably.Realtime({
        authCallback: async (tokenParams, callback) => {
          callback(null, tokenRequest);
        },
      });

      ablyClientRef.current = ably;

      // Get stream channel
      const channel = ably.channels.get(`stream:${sessionId}`);
      channelRef.current = channel;

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        ably.connection.on("connected", () => resolve());
        ably.connection.on("failed", (error) => reject(error));
      });

      // Start streaming loop
      const intervalMs = 1000 / settings.fps;
      streamIntervalRef.current = setInterval(streamLoop, intervalMs);

      setIsStreaming(true);
      frameCounterRef.current = 0;
      fpsCounterRef.current = 0;

      // Publish stream start metadata
      await channel.publish("stream-control", {
        type: "stream-control",
        sessionId,
        command: "start",
        timestamp: Date.now(),
      });

      console.log(
        `Video stream started: ${settings.fps} FPS, ${settings.quality}% quality`
      );
    } catch (error) {
      console.error("Failed to start stream:", error);
      setStreamError("Failed to start video stream");
      setIsStreaming(false);
    }
  }, [sessionId, videoElement, settings.fps, settings.quality, streamLoop]);

  /**
   * Stops the video stream
   */
  const stopStream = useCallback(async () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (channelRef.current && sessionId) {
      try {
        await channelRef.current.publish("stream-control", {
          type: "stream-control",
          sessionId,
          command: "stop",
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Failed to publish stream stop:", error);
      }
    }

    if (ablyClientRef.current) {
      ablyClientRef.current.close();
      ablyClientRef.current = null;
    }

    setIsStreaming(false);
    setFrameCount(0);
    setCurrentFPS(0);
    frameCounterRef.current = 0;
    fpsCounterRef.current = 0;

    console.log("Video stream stopped");
  }, [sessionId]);

  /**
   * Updates streaming settings
   */
  const updateSettings = useCallback(
    (newSettings: Partial<StreamSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };

        // If FPS changed and streaming, restart interval
        if (isStreaming && newSettings.fps && newSettings.fps !== prev.fps) {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
          }
          const intervalMs = 1000 / updated.fps;
          streamIntervalRef.current = setInterval(streamLoop, intervalMs);
        }

        return updated;
      });
    },
    [isStreaming, streamLoop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    streamError,
    frameCount,
    currentFPS,
    startStream,
    stopStream,
    updateSettings,
  };
}
