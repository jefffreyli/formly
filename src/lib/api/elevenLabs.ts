/**
 * ElevenLabs Text-to-Speech API Integration
 * Converts text feedback to natural speech audio
 */

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Default voice ID for "Adam" - professional, clear voice
// You can customize this with other voice IDs from ElevenLabs
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

interface TextToSpeechOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * Generates speech audio from text using ElevenLabs API
 * @param text - The text to convert to speech
 * @param options - Optional voice and model settings
 * @returns URL to the generated audio file
 */
export async function generateSpeech(
  text: string,
  options: TextToSpeechOptions = {}
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = "eleven_turbo_v2_5", // Fastest model for real-time feedback
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    // Call ElevenLabs TTS API
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as blob
    const audioBlob = await response.blob();

    // Convert blob to data URL for immediate playback
    // In production, you'd upload this to S3/R2 and return the URL
    const audioBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return audioDataUrl;
  } catch (error) {
    console.error("Failed to generate speech:", error);
    throw new Error("Failed to generate speech audio");
  }
}

/**
 * Lists available voices from ElevenLabs
 * Useful for voice customization
 */
export async function getAvailableVoices(): Promise<
  Array<{ voice_id: string; name: string; category: string }>
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    throw new Error("Failed to fetch available voices");
  }
}
