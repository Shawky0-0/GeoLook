import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { extractExifData } from "@/lib/exif-extractor";
import { analyzeImageWithOpenRouter } from "@/lib/openrouter";
import { geocodePlace } from "@/lib/geocoding";
import { GeoResult } from "@/types";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 1536;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided. Please upload an image." },
        { status: 400 }
      );
    }

    // Validate file type
    const mimeType = imageFile.type;
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}. Please upload a JPEG, PNG, WebP, GIF, or HEIC image.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (${(imageFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`,
        },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract EXIF data
    const exifData = await extractExifData(buffer);

    // If GPS data found in EXIF, return high-confidence result immediately
    if (exifData.hasGps && exifData.gps) {
      const { lat, lng } = exifData.gps;
      const processingTimeMs = Date.now() - startTime;

      const result: GeoResult = {
        location: {
          country: "GPS Location",
          region: "From EXIF Data",
          city: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          landmark: null,
          coordinates: { lat, lng },
          confidence: 99,
          radius_km: 0.01,
        },
        alternatives: [],
        analysis: {
          detected_features: ["GPS coordinates from EXIF metadata"],
          reasoning:
            "Location determined from embedded GPS coordinates in the image's EXIF metadata. This provides precise location data without requiring AI analysis.",
          exif_used: true,
          exif_data: {
            gps: { lat, lng },
            camera: exifData.camera,
            timestamp: exifData.timestamp,
          },
          model_used: "exif-gps",
          processing_time_ms: processingTimeMs,
        },
      };

      return NextResponse.json(result);
    }

    // Resize image using Sharp
    let processedBuffer: Buffer;
    let outputMimeType = "image/jpeg";

    try {
      processedBuffer = await sharp(buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (sharpError) {
      console.error("Sharp processing error:", sharpError);
      // Fall back to original buffer if sharp fails
      processedBuffer = buffer;
      outputMimeType = mimeType;
    }

    // Convert to base64
    const base64Image = processedBuffer.toString("base64");

    // Call OpenRouter AI
    let result: GeoResult;
    try {
      result = await analyzeImageWithOpenRouter(base64Image, outputMimeType);
    } catch (aiError) {
      console.error("AI analysis error:", aiError);
      return NextResponse.json(
        {
          error:
            aiError instanceof Error
              ? aiError.message
              : "AI analysis failed. Please check your API key and try again.",
          suggestion:
            "Make sure OPENROUTER_API_KEY is set correctly in your .env.local file.",
        },
        { status: 500 }
      );
    }

    // ── Geocoding correction ──────────────────────────────────────────────
    // AI identifies names accurately but coordinates are rough guesses.
    // Use Google Geocoding (primary) → Nominatim (fallback) for precision.
    try {
      const loc = result.location;
      const isKnown = (v: string | null | undefined) => v && v !== "Unknown";

      // Build queries from most → least specific
      const queries: string[] = [];

      // Full address: landmark + city + region + country
      if (isKnown(loc.landmark) && isKnown(loc.city) && isKnown(loc.region))
        queries.push(`${loc.landmark}, ${loc.city}, ${loc.region}, ${loc.country}`);
      if (isKnown(loc.landmark) && isKnown(loc.city))
        queries.push(`${loc.landmark}, ${loc.city}, ${loc.country}`);
      if (isKnown(loc.landmark))
        queries.push(`${loc.landmark}, ${loc.country}`);
      if (isKnown(loc.city) && isKnown(loc.region))
        queries.push(`${loc.city}, ${loc.region}, ${loc.country}`);
      if (isKnown(loc.city))
        queries.push(`${loc.city}, ${loc.country}`);
      if (isKnown(loc.country))
        queries.push(loc.country!);

      for (const query of queries) {
        const geocoded = await geocodePlace(query);
        if (geocoded) {
          result.location.coordinates = geocoded;
          if (isKnown(loc.landmark)) result.location.radius_km = Math.min(result.location.radius_km, 0.5);
          else if (isKnown(loc.city)) result.location.radius_km = Math.min(result.location.radius_km, 5);
          break;
        }
      }

      // Geocode alternatives (parallel)
      await Promise.all(
        result.alternatives.map(async (alt) => {
          const altQueries: string[] = [];
          if (isKnown(alt.city) && isKnown(alt.region))
            altQueries.push(`${alt.city}, ${alt.region}, ${alt.country}`);
          if (isKnown(alt.city))
            altQueries.push(`${alt.city}, ${alt.country}`);
          if (isKnown(alt.country))
            altQueries.push(alt.country!);

          for (const q of altQueries) {
            const geocoded = await geocodePlace(q);
            if (geocoded) { alt.coordinates = geocoded; break; }
          }
        })
      );
    } catch (geoErr) {
      console.error("Geocoding correction failed (using AI coords):", geoErr);
    }
    // ─────────────────────────────────────────────────────────────────────

    // Attach EXIF metadata if available (even without GPS)
    if (exifData.camera || exifData.timestamp) {
      result.analysis.exif_data = {
        camera: exifData.camera,
        timestamp: exifData.timestamp,
      };
    }

    // Update processing time to include total
    result.analysis.processing_time_ms = Date.now() - startTime;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        suggestion: "If this persists, try a different image format.",
      },
      { status: 500 }
    );
  }
}
