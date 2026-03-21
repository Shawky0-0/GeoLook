"use client";

import { useState, useEffect } from "react";
import { MapPin, Trash2, ExternalLink } from "lucide-react";
import { HistoryEntry, getHistory, clearHistory, timeAgo } from "@/lib/history";

const FLAG_MAP: Record<string, string> = {
  france: "🇫🇷", "united states": "🇺🇸", usa: "🇺🇸", "united kingdom": "🇬🇧",
  uk: "🇬🇧", germany: "🇩🇪", japan: "🇯🇵", china: "🇨🇳", italy: "🇮🇹",
  spain: "🇪🇸", australia: "🇦🇺", canada: "🇨🇦", brazil: "🇧🇷", india: "🇮🇳",
  russia: "🇷🇺", mexico: "🇲🇽", netherlands: "🇳🇱", sweden: "🇸🇪", norway: "🇳🇴",
  denmark: "🇩🇰", switzerland: "🇨🇭", austria: "🇦🇹", portugal: "🇵🇹",
  belgium: "🇧🇪", poland: "🇵🇱", turkey: "🇹🇷", greece: "🇬🇷", egypt: "🇪🇬",
  "south africa": "🇿🇦", argentina: "🇦🇷", colombia: "🇨🇴", chile: "🇨🇱",
  peru: "🇵🇪", "south korea": "🇰🇷", indonesia: "🇮🇩", thailand: "🇹🇭",
  vietnam: "🇻🇳", singapore: "🇸🇬", malaysia: "🇲🇾", "new zealand": "🇳🇿",
  ireland: "🇮🇪", "czech republic": "🇨🇿", hungary: "🇭🇺", romania: "🇷🇴",
  ukraine: "🇺🇦", finland: "🇫🇮", morocco: "🇲🇦", kenya: "🇰🇪", nigeria: "🇳🇬",
  ghana: "🇬🇭", ethiopia: "🇪🇹", "saudi arabia": "🇸🇦",
  "united arab emirates": "🇦🇪", uae: "🇦🇪", palestine: "🇵🇸",
  iran: "🇮🇷", pakistan: "🇵🇰", bangladesh: "🇧🇩", philippines: "🇵🇭",
  taiwan: "🇹🇼", "hong kong": "🇭🇰", iceland: "🇮🇸", croatia: "🇭🇷",
};

function getFlag(country: string) {
  return FLAG_MAP[country.toLowerCase()] ?? "🌍";
}

function ConfBar({ value }: { value: number }) {
  const color = value >= 80 ? "#4ade80" : value >= 55 ? "#facc15" : "#f87171";
  return (
    <div className="h-[2px] rounded-full w-full mt-1.5" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

interface Props {
  /** Pass refreshKey to force re-read from localStorage after new result */
  refreshKey?: number;
}

export default function DiscoveryHistory({ refreshKey }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, [refreshKey]);

  if (history.length === 0) return null;

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  const uniqueCountries = Array.from(new Set(history.map((h) => h.country))).length;

  return (
    <div className="w-full mt-8">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Your Discoveries
          </span>
          <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600">
            {uniqueCountries} {uniqueCountries === 1 ? "country" : "countries"}
          </span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Scrollable card list */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)", maskImage: "linear-gradient(to right, black 80%, transparent 100%)" }}
      >
        {history.map((entry) => {
          const name = entry.landmark || entry.city || entry.country;
          const mapsUrl = `https://www.google.com/maps?q=${entry.lat},${entry.lng}`;
          return (
            <div
              key={entry.id}
              className="shrink-0 w-40 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-zinc-600 transition-all group"
            >
              {/* Colored top strip based on confidence */}
              <div
                className="h-[2px]"
                style={{
                  background: entry.confidence >= 80
                    ? "linear-gradient(to right,#4ade80,#22c55e)"
                    : entry.confidence >= 55
                    ? "linear-gradient(to right,#facc15,#f59e0b)"
                    : "linear-gradient(to right,#f87171,#ef4444)",
                }}
              />
              <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg leading-none">{getFlag(entry.country)}</span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-blue-400"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs font-semibold text-zinc-100 leading-tight truncate">{name}</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {[entry.city, entry.country].filter(Boolean).join(", ")}
                </p>
                <ConfBar value={entry.confidence} />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] font-mono text-zinc-600">{entry.confidence}%</span>
                  <span className="text-[9px] text-zinc-700">{timeAgo(entry.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
