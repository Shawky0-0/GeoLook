"use client";

import { useEffect, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";

interface NearbyPlace {
  pageid: number;
  title: string;
  dist: number;
  thumbnail?: string;
  description?: string;
}

async function fetchNearby(lat: number, lng: number): Promise<NearbyPlace[]> {
  const geoUrl =
    `https://en.wikipedia.org/w/api.php?action=query&list=geosearch` +
    `&gscoord=${lat}|${lng}&gsradius=10000&gslimit=10&format=json&origin=*`;

  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();
  const hits: Array<{ pageid: number; title: string; dist: number }> =
    geoData?.query?.geosearch ?? [];

  if (!hits.length) return [];

  // Fetch summaries in parallel (thumbnails + description)
  const summaries = await Promise.all(
    hits.slice(0, 8).map(async (h) => {
      try {
        const r = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.title)}`
        );
        if (!r.ok) return null;
        const d = await r.json();
        return {
          pageid: h.pageid,
          title: h.title,
          dist: h.dist,
          thumbnail: d?.thumbnail?.source as string | undefined,
          description: d?.description as string | undefined,
        } satisfies NearbyPlace;
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s) => s !== null) as NearbyPlace[];
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

interface Props {
  lat: number;
  lng: number;
  /** The primary detected landmark — we hide it from the nearby list */
  primaryTitle?: string | null;
}

export default function NearbyPlaces({ lat, lng, primaryTitle }: Props) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchNearby(lat, lng)
      .then((results) => {
        if (!active) return;
        const filtered = results.filter(
          (p) => p.title.toLowerCase() !== (primaryTitle ?? "").toLowerCase()
        );
        setPlaces(filtered.slice(0, 7));
      })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lat, lng, primaryTitle]);

  if (!loading && places.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-xl animate-fade-in">
      <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100">Nearby Places</h2>
        <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
          within 10km
        </span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shrink-0 w-36 rounded-xl bg-zinc-800/60 animate-pulse" style={{ height: 156 }} />
            ))}
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitMaskImage: "linear-gradient(to right, black 85%, transparent 100%)",
              maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
            }}
          >
            {places.map((place) => (
              <a
                key={place.pageid}
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(place.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group shrink-0 w-36 rounded-xl overflow-hidden border border-white/8 bg-zinc-900/60 hover:border-emerald-500/30 hover:bg-zinc-800/80 transition-all duration-200 flex flex-col"
              >
                {/* Photo */}
                <div className="relative h-24 bg-zinc-800 overflow-hidden">
                  {place.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={place.thumbnail}
                      alt={place.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                  {/* Distance badge */}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[9px] font-mono text-emerald-400">
                    {formatDist(place.dist)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col flex-1">
                  <p className="text-[11px] font-semibold text-zinc-100 leading-tight line-clamp-2 group-hover:text-emerald-300 transition-colors">
                    {place.title}
                  </p>
                  {place.description && (
                    <p className="text-[9px] text-zinc-600 mt-1 leading-tight line-clamp-2">
                      {place.description}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center gap-1 text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" />
                    Wikipedia
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
