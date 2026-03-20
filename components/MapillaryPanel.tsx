"use client";

import { useEffect, useRef, useState } from "react";
import "mapillary-js/dist/mapillary.css";

interface MapillaryPanelProps {
  lat: number;
  lng: number;
  locationLabel: string;
}

type Status = "loading" | "loaded" | "no-coverage" | "error";

// Search with expanding radius until an image is found
async function findNearestImage(lat: number, lng: number, token: string): Promise<string | null> {
  const deltas = [0.003, 0.008, 0.02, 0.05]; // ~300m → 500m → 2km → 5km
  for (const d of deltas) {
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    try {
      const res = await fetch(
        `https://graph.mapillary.com/images?fields=id,geometry&bbox=${bbox}&limit=1&access_token=${token}`,
        { signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      const id = data?.data?.[0]?.id as string | undefined;
      if (id) return id;
    } catch {
      // try next delta
    }
  }
  return null;
}

export default function MapillaryPanel({ lat, lng, locationLabel }: MapillaryPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [imageId, setImageId] = useState<string | null>(null);

  // Step 1: find nearest image ID
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
    if (!token) { setStatus("error"); return; }

    setStatus("loading");
    setImageId(null);

    let cancelled = false;
    findNearestImage(lat, lng, token).then((id) => {
      if (cancelled) return;
      if (id) setImageId(id);
      else setStatus("no-coverage");
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => { cancelled = true; };
  }, [lat, lng]);

  // Step 2: mount Mapillary viewer once we have an image ID
  useEffect(() => {
    if (!imageId || !containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN!;
    let viewer: { remove: () => void } | null = null;

    import("mapillary-js").then(({ Viewer }) => {
      if (!containerRef.current) return;
      // Clear previous
      containerRef.current.innerHTML = "";

      viewer = new Viewer({
        accessToken: token,
        container: containerRef.current,
        imageId,
        component: { cover: false, attribution: true },
      });

      // @ts-expect-error - mapillary types
      viewer.on("image", () => setStatus("loaded"));
      // @ts-expect-error - mapillary types
      viewer.on("error", () => setStatus("error"));
    }).catch(() => setStatus("error"));

    return () => {
      try { viewer?.remove(); } catch { /* ignore */ }
    };
  }, [imageId]);

  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17`;

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950">

      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-t-violet-400 border-zinc-700 animate-spin" />
              <div className="absolute inset-2 rounded-full border border-violet-500/30" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Finding street imagery…</p>
            <p className="text-xs text-zinc-600">{locationLabel}</p>
          </div>
        </div>
      )}

      {/* No coverage */}
      {status === "no-coverage" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">No street imagery nearby</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Mapillary has no crowd-sourced photos within 5km of this location.
            </p>
            <a
              href={mapillaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Browse on Mapillary
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
            <p className="text-sm text-zinc-400 mb-3">Could not load street imagery.</p>
            <a href={mapillaryUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:underline">
              Open in Mapillary ↗
            </a>
          </div>
        </div>
      )}

      {/* Mapillary viewer container */}
      <div
        ref={containerRef}
        className="flex-1"
        style={{ opacity: status === "loaded" ? 1 : 0, transition: "opacity 0.4s" }}
      />

      {/* Top bar when loaded */}
      {status === "loaded" && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 bg-zinc-950/80 border border-violet-500/25 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-violet-300">Mapillary · {locationLabel}</span>
          </div>
          <a
            href={mapillaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1 bg-zinc-950/80 border border-zinc-700 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-white transition-colors"
          >
            Open full view
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      )}

      {/* Mapillary CSS */}
      <style>{`
        .mapillary-js { width: 100% !important; height: 100% !important; }
        .mapillary-js canvas { width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  );
}
