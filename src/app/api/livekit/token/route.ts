import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

/**
 * POST /api/livekit/token
 * Generates LiveKit access token for client authentication
 *
 * This endpoint creates tokens that allow clients to:
 * - Join a room specific to their session
 * - Publish video/audio tracks
 * - Subscribe to tracks from other participants (for future visionOS client)
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, identity } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit environment variables not configured");
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity || `web-${sessionId}`,
      // Token valid for 1 hour
      ttl: "1h",
    });

    // Grant permissions to join the room and publish/subscribe
    at.addGrant({
      roomJoin: true,
      room: sessionId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
    });
  } catch (error) {
    console.error("Error creating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to create access token" },
      { status: 500 }
    );
  }
}
