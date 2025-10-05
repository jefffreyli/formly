"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

interface UseLiveKitStreamReturn {
  isStreaming: boolean;
  streamError: string | null;
  connectionState: string;
  startStream: () => Promise<void>;
  stopStream: () => void;
}

/**
 * Hook for streaming video/audio to LiveKit using WebRTC
 *
 * This replaces the Ably-based video streaming which was sending base64 JPEG frames.
 * LiveKit uses native WebRTC for efficient real-time A/V streaming.
 *
 * @param mediaStream - The MediaStream from getUserMedia (camera)
 * @param sessionId - The unique session identifier (used as room name)
 * @returns Stream state and controls
 */
export function useLiveKitStream(
  mediaStream: MediaStream | null,
  sessionId: string | null
): UseLiveKitStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>("disconnected");

  const roomRef = useRef<Room | null>(null);

  /**
   * Starts the LiveKit stream
   */
  const startStream = useCallback(async () => {
    if (!sessionId || !mediaStream) {
      setStreamError("Missing session ID or media stream");
      return;
    }

    try {
      setStreamError(null);

      // Get LiveKit access token from server
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get LiveKit token");
      }

      const { token, wsUrl } = await response.json();

      // Create LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
        },
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log("Connected to LiveKit room:", sessionId);
        setConnectionState("connected");
        setIsStreaming(true);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from LiveKit room");
        setConnectionState("disconnected");
        setIsStreaming(false);
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log("Reconnecting to LiveKit room");
        setConnectionState("reconnecting");
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("Reconnected to LiveKit room");
        setConnectionState("connected");
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state.toString());
      });

      // Connect to room
      await room.connect(wsUrl, token);

      // Publish camera track
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        await room.localParticipant.publishTrack(videoTrack, {
          name: "camera",
          source: Track.Source.Camera,
        });
        console.log("Published camera track to LiveKit");
      }

      // Publish audio track if available
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        await room.localParticipant.publishTrack(audioTrack, {
          name: "microphone",
          source: Track.Source.Microphone,
        });
        console.log("Published microphone track to LiveKit");
      }

      console.log(`LiveKit stream started for session: ${sessionId}`);
    } catch (error) {
      console.error("Failed to start LiveKit stream:", error);
      setStreamError("Failed to start video stream");
      setIsStreaming(false);
      setConnectionState("disconnected");
    }
  }, [sessionId, mediaStream]);

  /**
   * Stops the LiveKit stream
   */
  const stopStream = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setIsStreaming(false);
    setConnectionState("disconnected");
    console.log("LiveKit stream stopped");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    isStreaming,
    streamError,
    connectionState,
    startStream,
    stopStream,
  };
}
