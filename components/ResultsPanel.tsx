"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Camera,
  Navigation,
  Info,
  Layers,
  Download,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { GeoResult, AnalysisState } from "@/types";
import { downloadResultCard } from "@/lib/generateCard";
import ConfidenceBar from "./ConfidenceBar";
import ConfidenceRing from "./ConfidenceRing";

interface ResultsPanelProps {
  result: GeoResult | null;
  state: AnalysisState;
  onSelectAlternative?: (lat: number, lng: number, index: number) => void;
  selectedAltIndex?: number;
  photoUrl?: string;
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    france: "🇫🇷",
    "united states": "🇺🇸",
    usa: "🇺🇸",
    "united kingdom": "🇬🇧",
    uk: "🇬🇧",
    germany: "🇩🇪",
    japan: "🇯🇵",
    china: "🇨🇳",
    italy: "🇮🇹",
    spain: "🇪🇸",
    australia: "🇦🇺",
    canada: "🇨🇦",
    brazil: "🇧🇷",
    india: "🇮🇳",
    russia: "🇷🇺",
    mexico: "🇲🇽",
    netherlands: "🇳🇱",
    sweden: "🇸🇪",
    norway: "🇳🇴",
    denmark: "🇩🇰",
    switzerland: "🇨🇭",
    austria: "🇦🇹",
    portugal: "🇵🇹",
    belgium: "🇧🇪",
    poland: "🇵🇱",
    turkey: "🇹🇷",
    greece: "🇬🇷",
    egypt: "🇪🇬",
    "south africa": "🇿🇦",
    argentina: "🇦🇷",
    colombia: "🇨🇴",
    chile: "🇨🇱",
    peru: "🇵🇪",
    "south korea": "🇰🇷",
    indonesia: "🇮🇩",
    thailand: "🇹🇭",
    vietnam: "🇻🇳",
    singapore: "🇸🇬",
    malaysia: "🇲🇾",
    "new zealand": "🇳🇿",
    ireland: "🇮🇪",
    "czech republic": "🇨🇿",
    hungary: "🇭🇺",
    romania: "🇷🇴",
    ukraine: "🇺🇦",
    finland: "🇫🇮",
    morocco: "🇲🇦",
    kenya: "🇰🇪",
    nigeria: "🇳🇬",
    ghana: "🇬🇭",
    ethiopia: "🇪🇹",
    "saudi arabia": "🇸🇦",
    "united arab emirates": "🇦🇪",
    uae: "🇦🇪",
    palestine: "🇵🇸",
    iran: "🇮🇷",
    pakistan: "🇵🇰",
    bangladesh: "🇧🇩",
    philippines: "🇵🇭",
    taiwan: "🇹🇼",
    "hong kong": "🇭🇰",
    iceland: "🇮🇸",
    croatia: "🇭🇷",
    serbia: "🇷🇸",
    slovakia: "🇸🇰",
    latvia: "🇱🇻",
    estonia: "🇪🇪",
    lithuania: "🇱🇹",
    bulgaria: "🇧🇬",
    luxembourg: "🇱🇺",
    "gps location": "📍",
  };
  const key = country.toLowerCase();
  return flags[key] || "🌍";
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildLocationLabel(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => Boolean(p) && p !== "Unknown")
    .filter((p) => {
      const key = p.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

const PILL_COLORS = [
  "bg-blue-500/10 border-blue-500/25 text-blue-300",
  "bg-violet-500/10 border-violet-500/25 text-violet-300",
  "bg-cyan-500/10 border-cyan-500/25 text-cyan-300",
  "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
  "bg-pink-500/10 border-pink-500/25 text-pink-300",
  "bg-amber-500/10 border-amber-500/25 text-amber-300",
];

export default function ResultsPanel({
  result,
  state,
  onSelectAlternative,
  selectedAltIndex,
  photoUrl,
}: ResultsPanelProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  if (state === "idle" || (!result && state !== "analyzing")) {
    return null;
  }

  if (state === "analyzing") {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-zinc-800 rounded w-40 mb-2" />
            <div className="h-3 bg-zinc-800 rounded w-60" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-4/5" />
          <div className="h-3 bg-zinc-800 rounded w-3/5" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { location, alternatives, analysis } = result;
  const flag = getCountryFlag(location.country);

  const locationParts = [
    location.landmark,
    location.city !== "Unknown" ? location.city : null,
    location.region !== "Unknown" ? location.region : null,
    location.country !== "Unknown" ? location.country : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Primary Location Card ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
        {/* Rainbow top strip */}
        <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">Detected Location</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-green-400">LIVE</span>
            </div>
            <button
              onClick={async () => {
                if (!result || savingCard) return;
                setSavingCard(true);
                try { await downloadResultCard(result, photoUrl); }
                finally { setSavingCard(false); }
              }}
              disabled={savingCard}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
              title="Save result as image"
            >
              {savingCard
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Download className="w-3 h-3" />}
              Save Card
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Location name */}
          <div className="flex items-start gap-3 mb-5">
            <span className="text-4xl leading-none mt-0.5 drop-shadow-lg" aria-hidden>
              {flag}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white leading-tight truncate">
                {location.landmark || location.city || location.country}
              </h3>
              <p className="text-sm text-zinc-400 mt-0.5">
                {locationParts.join(" · ")}
              </p>
              <p className="text-xs text-zinc-600 mt-1 font-mono">
                {formatCoords(location.coordinates.lat, location.coordinates.lng)}
              </p>
            </div>
          </div>

          {/* Confidence ring + accuracy */}
          <div className="flex items-center gap-5 mt-2">
            <ConfidenceRing confidence={location.confidence} size={88} />
            <div className="flex-1 space-y-2">
              <ConfidenceBar confidence={location.confidence} showLabel={false} size="sm" />
              <p className="text-xs text-zinc-600">
                Accuracy: ±{location.radius_km < 1
                  ? `${(location.radius_km * 1000).toFixed(0)}m`
                  : `${location.radius_km}km`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analysis Details ── */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        {/* Violet/cyan top strip */}
        <div className="h-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

        <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">Analysis Details</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Detected features */}
          {analysis.detected_features.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">
                Visual Features Detected
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.detected_features.map((feature, i) => (
                  <span
                    key={i}
                    className={clsx(
                      "inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium",
                      PILL_COLORS[i % PILL_COLORS.length]
                    )}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Model & timing */}
          <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs bg-cyan-500/5 border border-cyan-500/10 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span className="text-zinc-500">Time: <span className="text-cyan-300 font-medium">{formatProcessingTime(analysis.processing_time_ms)}</span></span>
            </div>
          </div>

          {/* AI Reasoning - collapsible */}
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center justify-between text-sm font-medium text-zinc-300 hover:text-white transition-colors py-1"
            >
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-violet-400" />
                <span>AI Reasoning</span>
              </div>
              {showReasoning ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>

            {showReasoning && (
              <div className="mt-3 text-sm text-zinc-400 leading-relaxed bg-zinc-950/50 rounded-xl p-3.5 border border-white/5">
                {analysis.reasoning}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EXIF Data ── */}
      {analysis.exif_data &&
        (analysis.exif_data.camera ||
          analysis.exif_data.timestamp ||
          analysis.exif_data.gps) && (
          <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
            <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-100">EXIF Metadata</h2>
              {analysis.exif_used && (
                <span className="ml-auto text-xs bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full font-semibold">
                  Used for detection
                </span>
              )}
            </div>

            <div className="p-5 space-y-2.5">
              {analysis.exif_data.gps && (
                <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5">
                  <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wide font-semibold">GPS Coordinates</p>
                    <p className="text-sm text-zinc-200 font-mono">
                      {formatCoords(analysis.exif_data.gps.lat, analysis.exif_data.gps.lng)}
                    </p>
                  </div>
                </div>
              )}
              {analysis.exif_data.camera && (
                <div className="flex items-center gap-3 bg-zinc-800/30 border border-white/5 rounded-xl px-3 py-2.5">
                  <Camera className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wide font-semibold">Camera</p>
                    <p className="text-sm text-zinc-200">{analysis.exif_data.camera}</p>
                  </div>
                </div>
              )}
              {analysis.exif_data.timestamp && (
                <div className="flex items-center gap-3 bg-zinc-800/30 border border-white/5 rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wide font-semibold">Captured</p>
                    <p className="text-sm text-zinc-200">{analysis.exif_data.timestamp}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── Alternative Locations ── */}
      {alternatives.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500" />

          <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100">Alternative Locations</h2>
            <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
              {alternatives.length} suggestions
            </span>
          </div>

          <div className="p-3 space-y-2">
            {alternatives.map((alt, index) => {
              const altFlag = getCountryFlag(alt.country);
              const label = buildLocationLabel([alt.city, alt.region, alt.country]);
              const isSelected = selectedAltIndex === index;
              return (
                <button
                  key={index}
                  onClick={() =>
                    onSelectAlternative?.(alt.coordinates.lat, alt.coordinates.lng, index)
                  }
                  className={clsx(
                    "w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-150 border",
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/5"
                      : "bg-zinc-800/30 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/60"
                  )}
                >
                  {/* Index badge */}
                  <div className={clsx(
                    "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                    isSelected
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "bg-zinc-700/60 border-zinc-600/60 text-zinc-400"
                  )}>
                    {index + 1}
                  </div>

                  {/* Flag */}
                  <span className="text-xl shrink-0" aria-hidden>{altFlag}</span>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      "text-sm font-medium truncate",
                      isSelected ? "text-white" : "text-zinc-200"
                    )}>
                      {label}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${alt.confidence}%`,
                            background: alt.confidence >= 70 ? "#22c55e" : alt.confidence >= 40 ? "#eab308" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className={clsx(
                        "text-[10px] font-semibold tabular-nums shrink-0",
                        alt.confidence >= 70 ? "text-green-400" : alt.confidence >= 40 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {alt.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Map pin icon */}
                  <MapPin className={clsx(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    isSelected ? "text-blue-400" : "text-zinc-600"
                  )} />
                </button>
              );
            })}
          </div>

          <p className="px-5 pb-4 text-[10px] text-zinc-600">
            Click an alternative to view it on the map
          </p>
        </div>
      )}

    </div>
  );
}
