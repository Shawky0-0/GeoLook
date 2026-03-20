import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch } from "lucide-react";

interface Props {
  searchParams: { lat?: string; lng?: string; place?: string; conf?: string; country?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const place = searchParams.place ?? "Unknown Location";
  const conf = searchParams.conf ?? "?";
  return {
    title: `${place} — GeoLook`,
    description: `AI detected this photo was taken in ${place} with ${conf}% confidence.`,
    openGraph: {
      title: `📍 ${place} — GeoLook`,
      description: `AI detected this photo was taken in ${place} with ${conf}% confidence. Try GeoLook to analyze your own photos.`,
      type: "website",
    },
  };
}

function formatCoords(lat: string, lng: string): string {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (isNaN(la) || isNaN(lo)) return "";
  const latDir = la >= 0 ? "N" : "S";
  const lngDir = lo >= 0 ? "E" : "W";
  return `${Math.abs(la).toFixed(4)}° ${latDir}, ${Math.abs(lo).toFixed(4)}° ${lngDir}`;
}

function getConfColor(conf: number) {
  if (conf >= 80) return "#4ade80";
  if (conf >= 55) return "#facc15";
  return "#f87171";
}

export default function SharePage({ searchParams }: Props) {
  const { lat, lng, place, conf, country } = searchParams;
  const confidence = conf ? parseInt(conf, 10) : null;
  const coords = lat && lng ? formatCoords(lat, lng) : null;
  const confColor = confidence ? getConfColor(confidence) : "#4ade80";

  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Ambient orbs */}
      <div className="fixed top-[-200px] left-[-150px] w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4), transparent 70%)" }} />
      <div className="fixed bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)" }} />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" style={{ background: "#0f1015", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

        <div className="p-7">
          {/* Branding */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <ScanSearch className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-sm font-bold text-zinc-300">GeoLook</span>
            <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">AI Result</span>
          </div>

          {/* Location */}
          <div className="mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Location Identified</p>
            <h1 className="text-2xl font-black text-white leading-tight mb-1">
              {place ?? "Unknown Location"}
            </h1>
            {coords && (
              <p className="text-xs font-mono text-zinc-500">{coords}</p>
            )}
          </div>

          {/* Confidence ring area */}
          {confidence !== null && (
            <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Circle */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke={confColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - confidence / 100)}`}
                    style={{ filter: `drop-shadow(0 0 6px ${confColor})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black" style={{ color: confColor }}>{confidence}%</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-0.5">AI Confidence</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {confidence >= 80 ? "High certainty" : confidence >= 55 ? "Moderate certainty" : "Low certainty"}
                </p>
                {country && <p className="text-xs text-zinc-600 mt-0.5">{country}</p>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <ScanSearch className="w-4 h-4" />
              Analyze Your Own Photo
            </Link>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-zinc-300 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                🗺️ Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-700">
        Shared via <span className="text-zinc-500">GeoLook AI</span>
      </p>
    </div>
  );
}
