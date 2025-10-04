// Type definitions for Gemini API responses
// These are used by the @google/genai SDK

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  executableCode?: {
    language?: string;
    code?: string;
  };
  codeExecutionResult?: {
    outcome?: string;
    output?: string;
  };
}

export interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

export interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: string;
  index?: number;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
