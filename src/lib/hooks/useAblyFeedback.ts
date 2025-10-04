import { useEffect, useState, useRef } from "react";
import Ably from "ably/promises";
import type { FormFeedback } from "@/types/exercise";

interface FeedbackMessage {
  sessionId: string;
  formFeedback: FormFeedback;
  audioUrl: string | null;
  timestamp: number;
}

interface UseAblyFeedbackReturn {
  feedback: FeedbackMessage | null;
  isConnected: boolean;
  error: string | null;
  playAudio: () => Promise<void>;
}

/**
 * Hook for subscribing to real-time feedback via Ably
 * @param sessionId - The unique session identifier
 * @param enabled - Whether to connect to Ably
 * @returns Real-time feedback state
 */
export function useAblyFeedback(
  sessionId: string | null,
  enabled: boolean
): UseAblyFeedbackReturn {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) {
      // Cleanup if disabled
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
        ablyClientRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Initialize Ably connection
    const initializeAbly = async () => {
      try {
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

        // Subscribe to session channel
        const channel = ably.channels.get(`session:${sessionId}`);
        channelRef.current = channel;

        // Handle connection state
        ably.connection.on("connected", () => {
          setIsConnected(true);
          setError(null);
          console.log("Connected to Ably");
        });

        ably.connection.on("disconnected", () => {
          setIsConnected(false);
          console.log("Disconnected from Ably");
        });

        ably.connection.on("failed", (stateChange) => {
          setIsConnected(false);
          setError("Connection failed");
          console.error("Ably connection failed:", stateChange.reason);
        });

        // Subscribe to feedback messages
        channel.subscribe("feedback", (message) => {
          const feedbackData = message.data as FeedbackMessage;
          setFeedback(feedbackData);

          // Auto-play audio if available
          if (feedbackData.audioUrl) {
            playAudioFromUrl(feedbackData.audioUrl);
          }
        });

        console.log(`Subscribed to session:${sessionId}`);
      } catch (err) {
        console.error("Failed to initialize Ably:", err);
        setError("Failed to connect to real-time service");
      }
    };

    initializeAbly();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (ablyClientRef.current) {
        ablyClientRef.current.close();
      }
    };
  }, [sessionId, enabled]);

  // Function to play audio
  const playAudio = async (): Promise<void> => {
    if (feedback?.audioUrl && audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error("Failed to play audio:", err);
      }
    }
  };

  // Helper to play audio from URL
  const playAudioFromUrl = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = url;
    audioRef.current.play().catch((err) => {
      console.error("Failed to auto-play audio:", err);
    });
  };

  return {
    feedback,
    isConnected,
    error,
    playAudio,
  };
}
