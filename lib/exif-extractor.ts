import exifr from "exifr";

export interface ExifData {
  gps?: { lat: number; lng: number };
  camera?: string;
  timestamp?: string;
  hasGps: boolean;
}

export async function extractExifData(buffer: Buffer): Promise<ExifData> {
  try {
    const parsed = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      exif: true,
    });

    if (!parsed) {
      return { hasGps: false };
    }

    let gps: { lat: number; lng: number } | undefined;

    if (
      parsed.latitude !== undefined &&
      parsed.longitude !== undefined &&
      !isNaN(parsed.latitude) &&
      !isNaN(parsed.longitude)
    ) {
      gps = {
        lat: parsed.latitude,
        lng: parsed.longitude,
      };
    }

    let camera: string | undefined;
    const make = parsed.Make || parsed.make;
    const model = parsed.Model || parsed.model;

    if (make && model) {
      camera = `${make} ${model}`.trim();
    } else if (model) {
      camera = String(model);
    } else if (make) {
      camera = String(make);
    }

    let timestamp: string | undefined;
    const dateTime =
      parsed.DateTimeOriginal ||
      parsed.DateTime ||
      parsed.CreateDate ||
      parsed.dateTimeOriginal;

    if (dateTime) {
      if (dateTime instanceof Date) {
        timestamp = dateTime.toISOString();
      } else if (typeof dateTime === "string") {
        timestamp = dateTime;
      }
    }

    return {
      gps,
      camera,
      timestamp,
      hasGps: !!gps,
    };
  } catch (error) {
    console.error("EXIF extraction error:", error);
    return { hasGps: false };
  }
}
