import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/api/elevenLabs";

export const runtime = "nodejs";
export const maxDuration = 10; // 10 seconds max for TTS

interface TextToSpeechRequest {
  text: string;
  voiceId?: string;
}

/**
 * POST /api/text-to-speech
 * Converts text feedback to natural speech audio using ElevenLabs
 */
export async function POST(request: NextRequest) {
  try {
    const body: TextToSpeechRequest = await request.json();
    const { text, voiceId } = body;

    // Validate request
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Generate speech audio
    const audioUrl = await generateSpeech(text, { voiceId });

    return NextResponse.json({
      success: true,
      audioUrl,
    });
  } catch (error) {
    console.error("Error generating speech:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate speech";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
