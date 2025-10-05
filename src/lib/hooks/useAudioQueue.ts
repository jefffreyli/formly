"use client";

import { useRef, useCallback, useEffect } from "react";

interface QueuedAudio {
  url: string;
  id: string;
}

interface UseAudioQueueReturn {
  enqueueAudio: (url: string) => void;
  isPlaying: boolean;
  clearQueue: () => void;
  currentAudioId: string | null;
}

/**
 * Hook for managing audio playback queue
 * Ensures audio plays one at a time without interruption
 */
export function useAudioQueue(): UseAudioQueueReturn {
  const queueRef = useRef<QueuedAudio[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const currentAudioIdRef = useRef<string | null>(null);
  const processedUrlsRef = useRef<Set<string>>(new Set());

  /**
   * Plays the next audio in queue
   */
  const playNext = useCallback(() => {
    // If already playing, don't start next
    if (isPlayingRef.current) {
      return;
    }

    // Get next audio from queue
    const nextAudio = queueRef.current.shift();
    if (!nextAudio) {
      currentAudioIdRef.current = null;
      return;
    }

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    currentAudioIdRef.current = nextAudio.id;
    isPlayingRef.current = true;

    // Set up event handlers
    const handleEnded = () => {
      isPlayingRef.current = false;
      currentAudioIdRef.current = null;
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Play next audio in queue
      playNext();
    };

    const handleError = (err: Event) => {
      console.error("Audio playback error:", err);
      isPlayingRef.current = false;
      currentAudioIdRef.current = null;
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Try next audio in queue
      playNext();
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Load and play
    audio.src = nextAudio.url;
    audio.play().catch((err) => {
      console.error("Failed to play audio:", err);
      handleError(err);
    });
  }, []);

  /**
   * Adds audio to queue and starts playback if not playing
   */
  const enqueueAudio = useCallback(
    (url: string) => {
      // Check if this URL was already processed recently (deduplication)
      if (processedUrlsRef.current.has(url)) {
        console.log("Duplicate audio URL, skipping:", url);
        return;
      }

      // Add to processed set
      processedUrlsRef.current.add(url);

      // Remove from processed set after 30 seconds (to allow same feedback later)
      setTimeout(() => {
        processedUrlsRef.current.delete(url);
      }, 30000);

      // Create unique ID for this audio
      const id = `${Date.now()}-${Math.random()}`;

      // Add to queue
      queueRef.current.push({ url, id });

      console.log(`Audio queued (${queueRef.current.length} in queue)`);

      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  /**
   * Clears the queue and stops current playback
   */
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    isPlayingRef.current = false;
    currentAudioIdRef.current = null;
    processedUrlsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearQueue();
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [clearQueue]);

  return {
    enqueueAudio,
    isPlaying: isPlayingRef.current,
    clearQueue,
    currentAudioId: currentAudioIdRef.current,
  };
}
