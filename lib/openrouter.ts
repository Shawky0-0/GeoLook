import { GeoResult } from "@/types";
import { buildGeoPrompt } from "./prompt-builder";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface RawGeoResponse {
  country?: string;
  region?: string;
  city?: string;
  landmark?: string | null;
  coordinates?: { lat?: number; lng?: number };
  confidence?: number;
  radius_km?: number;
  alternatives?: Array<{
    country?: string;
    region?: string;
    city?: string;
    coordinates?: { lat?: number; lng?: number };
    confidence?: number;
  }>;
  detected_features?: string[];
  reasoning?: string;
}

function parseJsonFromResponse(text: string): RawGeoResponse {
  // Strip markdown code blocks if present
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    cleaned = cleaned.substring(firstNewline + 1);
    const lastBacktick = cleaned.lastIndexOf("```");
    if (lastBacktick !== -1) {
      cleaned = cleaned.substring(0, lastBacktick);
    }
  }

  cleaned = cleaned.trim();

  // Find JSON object boundaries
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(cleaned);
}

function buildGeoResult(
  parsed: RawGeoResponse,
  modelUsed: string,
  processingTimeMs: number,
  exifUsed: boolean = false
): GeoResult {
  const location = {
    country: parsed.country || "Unknown",
    region: parsed.region || "Unknown",
    city: parsed.city || "Unknown",
    landmark: parsed.landmark || null,
    coordinates: {
      lat: parsed.coordinates?.lat ?? 0,
      lng: parsed.coordinates?.lng ?? 0,
    },
    confidence: Math.max(1, Math.min(100, parsed.confidence ?? 5)),
    radius_km: parsed.radius_km ?? 500,
  };

  const alternatives = (parsed.alternatives || []).map((alt) => ({
    country: alt.country || "Unknown",
    region: alt.region || "Unknown",
    city: alt.city || "Unknown",
    coordinates: {
      lat: alt.coordinates?.lat ?? 0,
      lng: alt.coordinates?.lng ?? 0,
    },
    confidence: Math.max(1, Math.min(100, alt.confidence ?? 5)),
  }));

  const analysis = {
    detected_features: parsed.detected_features || [],
    reasoning: parsed.reasoning || "No reasoning provided.",
    exif_used: exifUsed,
    model_used: modelUsed,
    processing_time_ms: processingTimeMs,
  };

  return { location, alternatives, analysis };
}

async function callOpenRouter(
  imageBase64: string,
  mimeType: string,
  model: string
): Promise<{ parsed: RawGeoResponse; modelUsed: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const { systemPrompt, userMessage } = buildGeoPrompt(dataUrl);

  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: userMessage,
      },
    ],
    max_tokens: 1500,
    temperature: 0.1,
  };

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": appUrl,
      "X-Title": "GeoLook",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error (${response.status}): ${errorText}`
    );
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from OpenRouter API");
  }

  const content = data.choices[0].message.content;
  const parsed = parseJsonFromResponse(content);

  return { parsed, modelUsed: model };
}

export async function analyzeImageWithOpenRouter(
  imageBase64: string,
  mimeType: string
): Promise<GeoResult> {
  const primaryModel =
    process.env.OPENROUTER_PRIMARY_MODEL || "anthropic/claude-opus-4";
  const fallbackModel =
    process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-4o";

  const startTime = Date.now();

  let parsed: RawGeoResponse | null = null;
  let modelUsed = primaryModel;

  // Try primary model first
  try {
    const result = await callOpenRouter(imageBase64, mimeType, primaryModel);
    parsed = result.parsed;
    modelUsed = result.modelUsed;

    // If confidence is too low, try fallback
    if ((parsed.confidence ?? 0) < 40) {
      console.log(
        `Primary model confidence too low (${parsed.confidence}), trying fallback...`
      );
      try {
        const fallbackResult = await callOpenRouter(
          imageBase64,
          mimeType,
          fallbackModel
        );
        if ((fallbackResult.parsed.confidence ?? 0) > (parsed.confidence ?? 0)) {
          parsed = fallbackResult.parsed;
          modelUsed = fallbackResult.modelUsed;
        }
      } catch (fallbackError) {
        console.error("Fallback model also failed:", fallbackError);
        // Keep primary result
      }
    }
  } catch (primaryError) {
    console.error("Primary model failed:", primaryError);

    // Try fallback model
    try {
      const fallbackResult = await callOpenRouter(
        imageBase64,
        mimeType,
        fallbackModel
      );
      parsed = fallbackResult.parsed;
      modelUsed = fallbackResult.modelUsed;
    } catch (fallbackError) {
      console.error("Fallback model also failed:", fallbackError);
      throw new Error(
        `Both models failed. Primary: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
      );
    }
  }

  if (!parsed) {
    throw new Error("Failed to get a valid response from any model");
  }

  const processingTimeMs = Date.now() - startTime;
  return buildGeoResult(parsed, modelUsed, processingTimeMs, false);
}
