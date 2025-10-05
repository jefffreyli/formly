import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/api/elevenLabs";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:TextToSpeech");

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
  const startTime = Date.now();

  try {
    const body: TextToSpeechRequest = await request.json();
    const { text, voiceId } = body;

    logger.info("Received TTS request", {
      textLength: text?.length,
      voiceId: voiceId || "default",
    });

    // Validate request
    if (!text || text.trim().length === 0) {
      logger.warn("Missing text in TTS request");
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Generate speech audio
    const audioUrl = await generateSpeech(text, { voiceId });

    const duration = Date.now() - startTime;
    logger.info("TTS generation complete", {
      duration: `${duration}ms`,
      audioUrlLength: audioUrl.length,
    });

    return NextResponse.json({
      success: true,
      audioUrl,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error generating speech", error, {
      duration: `${duration}ms`,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate speech";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
