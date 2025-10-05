import Ably from "ably";
import type {
  VideoFrameMessage,
  PoseOverlayMessage,
  StreamControlMessage,
  StreamMetadataMessage,
} from "@/types/stream";

let ablyClient: Ably.Rest | null = null;

/**
 * Gets or creates the Ably REST client instance
 */
function getAblyClient(): Ably.Rest {
  if (!ablyClient) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY environment variable is not set");
    }
    ablyClient = new Ably.Rest({ key: apiKey });
  }
  return ablyClient;
}

/**
 * Publishes a video frame to the stream channel
 * @param sessionId - The unique session identifier
 * @param frame - The video frame data
 */
export async function publishVideoFrame(
  sessionId: string,
  frame: VideoFrameMessage
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`stream:${sessionId}`);

    await channel.publish("video-frame", frame);
  } catch (error) {
    console.error("Failed to publish video frame to Ably:", error);
    throw new Error("Failed to publish video frame");
  }
}

/**
 * Publishes pose overlay data to the stream channel
 * @param sessionId - The unique session identifier
 * @param overlay - The pose overlay data
 */
export async function publishPoseOverlay(
  sessionId: string,
  overlay: PoseOverlayMessage
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`stream:${sessionId}`);

    await channel.publish("pose-overlay", overlay);
  } catch (error) {
    console.error("Failed to publish pose overlay to Ably:", error);
    throw new Error("Failed to publish pose overlay");
  }
}

/**
 * Publishes stream control message
 * @param sessionId - The unique session identifier
 * @param control - The control message
 */
export async function publishStreamControl(
  sessionId: string,
  control: StreamControlMessage
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`stream:${sessionId}`);

    await channel.publish("stream-control", control);
  } catch (error) {
    console.error("Failed to publish stream control to Ably:", error);
    throw new Error("Failed to publish stream control");
  }
}

/**
 * Publishes stream metadata
 * @param sessionId - The unique session identifier
 * @param metadata - The metadata message
 */
export async function publishStreamMetadata(
  sessionId: string,
  metadata: StreamMetadataMessage
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`stream:${sessionId}`);

    await channel.publish("stream-metadata", metadata);
  } catch (error) {
    console.error("Failed to publish stream metadata to Ably:", error);
    // Don't throw - metadata is non-critical
  }
}
