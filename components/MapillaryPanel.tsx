"use client";

import { useEffect, useRef, useState } from "react";
import "mapillary-js/dist/mapillary.css";

interface MapillaryPanelProps {
  lat: number;
  lng: number;
  locationLabel: string;
}

type Status = "loading" | "loaded" | "no-coverage" | "error";

type MapillaryImage = { id: string; geometry?: { coordinates: [number, number] } };
type SearchResult = { id: string; dist: number; iLat: number; iLng: number };
type ImageResult  = { id: string; iLat: number; iLng: number };

/** Compass bearing (0–360°, 0=North) from one point to another. */
function bearingTo(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const φ1 = fromLat * Math.PI / 180, φ2 = toLat * Math.PI / 180;
  const Δλ = (toLng - fromLng) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Haversine distance in metres between two lat/lng points. */
function distMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchBest(
  lat: number, lng: number, token: string,
  deltas: number[], isPano: boolean
): Promise<SearchResult | null> {
  for (const d of deltas) {
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const extra = isPano ? "&is_pano=true" : "";
    try {
      const res = await fetch(
        `https://graph.mapillary.com/images?fields=id,geometry&bbox=${bbox}&limit=25${extra}&access_token=${token}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const images: MapillaryImage[] = (await res.json())?.data ?? [];
      if (!images.length) continue;
      let best = images[0], bestDist = Infinity, bestLat = 0, bestLng = 0;
      for (const img of images) {
        if (!img.geometry) continue;
        const [iLng, iLat] = img.geometry.coordinates;
        const dist = (iLat - lat) ** 2 + (iLng - lng) ** 2;
        if (dist < bestDist) { bestDist = dist; best = img; bestLat = iLat; bestLng = iLng; }
      }
      return { id: best.id, dist: bestDist === Infinity ? 0 : bestDist, iLat: bestLat, iLng: bestLng };
    } catch { /* try next delta */ }
  }
  return null;
}

async function findNearestImage(lat: number, lng: number, token: string): Promise<ImageResult | null> {
  const [pano, close] = await Promise.all([
    fetchBest(lat, lng, token, [0.001, 0.003, 0.008, 0.02, 0.05], true),
    fetchBest(lat, lng, token, [0.001, 0.002, 0.004], false),
  ]);

  let chosen: SearchResult | null = null;
  if (pano && close) {
    chosen = Math.sqrt(close.dist) * 5 < Math.sqrt(pano.dist) ? close : pano;
  } else {
    chosen = pano ?? close;
  }
  if (chosen) return { id: chosen.id, iLat: chosen.iLat, iLng: chosen.iLng };

  const fallback = await fetchBest(lat, lng, token, [0.01, 0.05], false);
  return fallback ? { id: fallback.id, iLat: fallback.iLat, iLng: fallback.iLng } : null;
}

export default function MapillaryPanel({ lat, lng, locationLabel }: MapillaryPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [targetBearing, setTargetBearing] = useState<number | null>(null);
  const [distM, setDistM] = useState(0);
  const [viewBearing, setViewBearing] = useState(0);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
    if (!token) { setStatus("error"); return; }

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any = null;

    setStatus("loading");
    setTargetBearing(null);
    setViewBearing(0);

    (async () => {
      try {
        const imgResult = await findNearestImage(lat, lng, token);
        if (cancelled) return;
        if (!imgResult) { setStatus("no-coverage"); return; }

        const { id: imageId, iLat, iLng } = imgResult;
        const bearing = bearingTo(iLat, iLng, lat, lng);
        const dist = distMeters(iLat, iLng, lat, lng);

        const { Viewer } = await import("mapillary-js");
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        viewer = new Viewer({
          accessToken: token,
          container: containerRef.current,
          imageId,
          component: { cover: false, attribution: true },
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) { try { viewer?.resize(); } catch { /* ignore */ } }
          });
        });

        const markLoaded = () => {
          if (!cancelled) {
            setStatus("loaded");
            // Show arrow only when image spawned more than 20 m from target
            if (dist > 20) { setTargetBearing(bearing); setDistM(dist); }
          }
        };
        viewer.on("load", markLoaded);
        viewer.on("image", markLoaded);

        // Keep arrow synced with current viewing direction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viewer.on("bearing", (e: any) => { if (!cancelled) setViewBearing(e.bearing ?? 0); });

      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try { viewer?.remove(); } catch { /* ignore */ }
    };
  }, [lat, lng]);

  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17`;

  // Arrow rotation relative to where user is currently looking
  const arrowAngle = targetBearing !== null ? ((targetBearing - viewBearing + 360) % 360) : null;
  const distLabel = distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`;

  return (
    <div className="absolute inset-0 bg-zinc-950">

      {/* Mapillary container — always in DOM so Viewer measures real dimensions */}
      <div
        ref={containerRef}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: status === "loaded" ? 1 : 0,
          pointerEvents: status === "loaded" ? "auto" : "none",
          transition: "opacity 0.5s",
        }}
      />

      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-t-violet-400 border-zinc-700 animate-spin" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Finding street imagery…</p>
            <p className="text-xs text-zinc-600">{locationLabel}</p>
          </div>
        </div>
      )}

      {/* No coverage */}
      {status === "no-coverage" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">No street imagery nearby</h3>
            <p className="text-xs text-zinc-500 mb-4">Mapillary has no photos within 5 km of this location.</p>
            <a href={mapillaryUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              Browse on Mapillary
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
            <p className="text-sm text-zinc-400 mb-3">Could not load street imagery.</p>
            <a href={mapillaryUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:underline">Open in Mapillary ↗</a>
          </div>
        </div>
      )}

      {/* Top badge */}
      {status === "loaded" && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="inline-flex items-center gap-1.5 bg-zinc-950/80 border border-violet-500/25 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-violet-300">Mapillary · {locationLabel}</span>
          </div>
          <a href={mapillaryUrl} target="_blank" rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1 bg-zinc-950/80 border border-zinc-700 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-white transition-colors">
            Open full view
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      )}

      {/* ── Directional target arrow ── */}
      {status === "loaded" && arrowAngle !== null && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{ bottom: 44, left: "50%", transform: "translateX(-50%)" }}
        >
          <div style={{
            background: "rgba(9,9,11,0.88)",
            border: "1.5px solid rgba(139,92,246,0.5)",
            backdropFilter: "blur(10px)",
            borderRadius: 14,
            padding: "6px 12px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            boxShadow: "0 4px 24px rgba(139,92,246,0.2)",
          }}>
            {/* Rotating arrow */}
            <div style={{
              transform: `rotate(${arrowAngle}deg)`,
              transition: "transform 0.12s ease-out",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                {/* Arrow pointing up = toward target */}
                <path d="M12 3L5 20l7-5 7 5L12 3z" fill="#a78bfa" />
              </svg>
            </div>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#a78bfa">
                <circle cx="12" cy="10" r="4"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
              </svg>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em" }}>
                TARGET {distLabel} away
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {status === "loaded" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-zinc-950/70 backdrop-blur-sm border border-zinc-800 px-3 py-1 rounded-full">
            <p className="text-[10px] text-zinc-500">Drag to look around · Scroll to zoom</p>
          </div>
        </div>
      )}

      <style>{`
        .mapillary-js { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
        .mapillary-js canvas { display: block; }
      `}</style>
    </div>
  );
}
