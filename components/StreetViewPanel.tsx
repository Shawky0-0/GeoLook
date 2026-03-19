"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Status = "loading" | "ready" | "unavailable" | "auth-error";

interface StreetViewPanelProps {
  lat: number;
  lng: number;
  locationLabel: string;
  streetViewOpenUrl: string;
}

// Singleton script loader with gm_authFailure interception
function loadGoogleMapsScript(
  apiKey: string,
  onAuthFailure: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Intercept Google's auth failure BEFORE loading the script
    // This replaces Google's built-in error dialog with our own handler
    (window as any).gm_authFailure = () => {
      onAuthFailure();
      reject(new Error("Google Maps auth failure"));
    };

    if ((window as any).google?.maps?.StreetViewPanorama) {
      resolve();
      return;
    }
    const existing = document.getElementById("gmaps-sv-js");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const cb = `_gmSvReady_${Date.now()}`;
    (window as any)[cb] = resolve;
    const script = document.createElement("script");
    script.id = "gmaps-sv-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${cb}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => { onAuthFailure(); reject(new Error("Script load failed")); };
    document.head.appendChild(script);
  });
}

export default function StreetViewPanel({
  lat,
  lng,
  locationLabel,
  streetViewOpenUrl,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const [status, setStatus] = useState<Status>("loading");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!;

  useEffect(() => {
    let cancelled = false;
    let authFailed = false;
    setStatus("loading");

    // Destroy previous panorama if coordinates changed
    if (panoramaRef.current) {
      try { panoramaRef.current.setVisible(false); } catch (_) {}
      panoramaRef.current = null;
    }

    const handleAuthFailure = () => {
      authFailed = true;
      // Immediately hide the container via direct DOM to prevent dialog flash
      if (containerRef.current) {
        containerRef.current.style.display = "none";
      }
      // Also nuke any Google error overlays that snuck into the DOM
      document.querySelectorAll(".gm-err-container").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
      if (!cancelled) setStatus("auth-error");
    };

    loadGoogleMapsScript(apiKey, handleAuthFailure)
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const google = (window as any).google;
        const sv = new google.maps.StreetViewService();

        sv.getPanorama(
          {
            location: { lat, lng },
            radius: 1000,                           // search within 1km
            preference: google.maps.StreetViewPreference.NEAREST,
            source: google.maps.StreetViewSource.OUTDOOR,
          },
          (data: any, svStatus: string) => {
            if (cancelled || !containerRef.current) return;

            if (svStatus === "OK") {
              // Compute heading so the panorama faces the detected pin
              const heading = google.maps.geometry
                ? google.maps.geometry.spherical.computeHeading(
                    data.location.latLng,
                    new google.maps.LatLng(lat, lng)
                  )
                : 0;

              panoramaRef.current = new google.maps.StreetViewPanorama(
                containerRef.current,
                {
                  pano: data.location.pano,
                  pov: { heading, pitch: 0 },
                  zoom: 1,
                  // Full navigation — user can walk freely
                  linksControl: true,
                  panControl: true,
                  zoomControl: true,
                  addressControl: true,
                  fullscreenControl: true,
                  enableCloseButton: false,
                  motionTracking: false,
                  motionTrackingControl: false,
                  showRoadLabels: true,
                }
              );
              setStatus("ready");
            } else {
              setStatus("unavailable");
            }
          }
        );
      })
      .catch(() => {
        if (!cancelled && !authFailed) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, apiKey]);

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950">

      {/* Loading state */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950 gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
          </div>
          <p className="text-sm text-zinc-400">Loading Street View…</p>
          <p className="text-xs text-zinc-600">Finding nearby panorama</p>
        </div>
      )}

      {/* API key / billing error — replaces Google's popup */}
      {status === "auth-error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">API Key Needs Setup</h3>
          <p className="text-xs text-zinc-500 mb-4 max-w-xs leading-relaxed">
            Your key needs <strong className="text-zinc-400">Maps JavaScript API</strong> enabled and{" "}
            <strong className="text-zinc-400">localhost</strong> allowed in referrer restrictions.
          </p>
          <div className="text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 max-w-xs w-full space-y-2">
            {[
              "Google Cloud → Credentials → Edit key",
              'API restrictions → Maps JavaScript API',
              'App restrictions → Add localhost:3000/*',
              "Save and restart dev server",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-blue-400 mt-0.5 shrink-0">{i + 1}.</span>
                <span className="text-[11px] text-zinc-400">{s}</span>
              </div>
            ))}
          </div>
          <a href={streetViewOpenUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors border border-zinc-700">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in Google Maps instead
          </a>
        </div>
      )}

      {/* No street view available */}
      {status === "unavailable" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
              <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">
            No Street View available here
          </h3>
          <p className="text-xs text-zinc-600 mb-5 max-w-xs">
            Google Street View doesn&apos;t have coverage within 1km of this location. Try opening in Google Maps to explore nearby areas.
          </p>
          <a
            href={streetViewOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors border border-zinc-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open Google Maps
          </a>
        </div>
      )}

      {/* Panorama container — Google Maps renders into this div */}
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ display: status === "ready" ? "block" : "none" }}
      />

      {/* Footer bar (only when ready) */}
      {status === "ready" && (
        <div className="shrink-0 bg-zinc-950/95 border-t border-zinc-800 px-4 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <p className="text-xs text-zinc-300 font-medium truncate">
              {locationLabel || "Street View"}
            </p>
            <span className="text-[10px] text-zinc-600 hidden sm:block shrink-0">
              Use arrows to walk · drag to look around
            </span>
          </div>
          <a
            href={streetViewOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 rounded-lg"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Full screen
          </a>
        </div>
      )}
    </div>
  );
}
