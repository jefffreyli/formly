import { NextRequest, NextResponse } from "next/server";
import Ably from "ably/promises";

export const runtime = "nodejs";

/**
 * POST /api/ably/auth
 * Generates Ably token for client authentication
 *
 * This endpoint creates scoped tokens that allow clients to:
 * - Subscribe to their own session channel
 * - Receive real-time feedback updates
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      console.error("ABLY_API_KEY not configured");
      return NextResponse.json(
        { error: "Ably not configured" },
        { status: 500 }
      );
    }

    // Initialize Ably client with API key
    const ably = new Ably.Rest({ key: apiKey });

    // Create token with capabilities scoped to this session
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: sessionId,
      capability: {
        [`session:${sessionId}`]: ["subscribe"], // Can only subscribe to own session
      },
      ttl: 3600000, // 1 hour token validity
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Error creating Ably token:", error);
    return NextResponse.json(
      { error: "Failed to create auth token" },
      { status: 500 }
    );
  }
}
