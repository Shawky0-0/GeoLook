export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AlternativeLocation {
  country: string;
  region: string;
  city: string;
  coordinates: Coordinates;
  confidence: number;
}

export interface GeoAnalysis {
  detected_features: string[];
  reasoning: string;
  exif_used: boolean;
  exif_data?: {
    gps?: Coordinates;
    camera?: string;
    timestamp?: string;
  };
  model_used: string;
  processing_time_ms: number;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  landmark: string | null;
  coordinates: Coordinates;
  confidence: number;
  radius_km: number;
}

export interface GeoResult {
  location: GeoLocation;
  alternatives: AlternativeLocation[];
  analysis: GeoAnalysis;
}

export type AnalysisState = "idle" | "uploading" | "analyzing" | "done" | "error";
