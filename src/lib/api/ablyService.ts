import Ably from "ably";
import type { FormFeedback } from "@/types/exercise";

interface FeedbackPayload {
  sessionId: string;
  formFeedback: FormFeedback;
  audioUrl: string | null;
  timestamp: number;
}

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
 * Publishes feedback to a session's Ably channel
 * @param sessionId - The unique session identifier
 * @param payload - The feedback data to publish
 */
export async function publishFeedback(
  sessionId: string,
  payload: FeedbackPayload
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`session:${sessionId}`);

    await channel.publish("feedback", payload);

    console.log(`Published feedback to session:${sessionId}`);
  } catch (error) {
    console.error("Failed to publish feedback to Ably:", error);
    throw new Error("Failed to publish real-time feedback");
  }
}

/**
 * Publishes a session event (e.g., session started, session ended)
 * @param sessionId - The unique session identifier
 * @param event - The event type
 * @param data - Additional event data
 */
export async function publishSessionEvent(
  sessionId: string,
  event: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(`session:${sessionId}`);

    await channel.publish(event, {
      sessionId,
      timestamp: Date.now(),
      ...data,
    });

    console.log(`Published ${event} to session:${sessionId}`);
  } catch (error) {
    console.error(`Failed to publish ${event} to Ably:`, error);
    throw new Error("Failed to publish session event");
  }
}
