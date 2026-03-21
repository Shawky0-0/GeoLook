"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapillaryPanel from "./MapillaryPanel";
import { GeoResult, AnalysisState } from "@/types";

// Famous world locations to fly through during AI scan
const SCAN_LOCATIONS = [
  { lng: 2.347,   lat: 48.858,  zoom: 11, label: "Europe"       },  // Paris
  { lng: 139.692, lat: 35.689,  zoom: 11, label: "East Asia"    },  // Tokyo
  { lng: -73.985, lat: 40.748,  zoom: 11, label: "Americas"     },  // New York
  { lng: 31.235,  lat: 30.045,  zoom: 11, label: "Africa"       },  // Cairo
  { lng: 77.209,  lat: 28.614,  zoom: 11, label: "South Asia"   },  // Delhi
  { lng: -43.172, lat: -22.906, zoom: 10, label: "S. America"   },  // Rio
  { lng: 151.209, lat: -33.868, zoom: 11, label: "Oceania"      },  // Sydney
  { lng: -0.127,  lat: 51.507,  zoom: 11, label: "UK"           },  // London
  { lng: 37.617,  lat: 55.755,  zoom: 11, label: "E. Europe"    },  // Moscow
  { lng: 55.296,  lat: 25.197,  zoom: 11, label: "Middle East"  },  // Dubai
  { lng: 12.492,  lat: 41.890,  zoom: 11, label: "Mediterranean"},  // Rome
  { lng: -58.381, lat: -34.603, zoom: 10, label: "S. Atlantic"  },  // Buenos Aires
];

function rasterStyle(tileUrl: string, attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      raster: {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: "raster-layer", type: "raster", source: "raster" }],
  };
}

const TILE_LAYERS = {
  dark: {
    label: "Dark",
    emoji: "🌑",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  satellite: {
    label: "Satellite",
    emoji: "🛰️",
    style: rasterStyle(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS"
    ),
  },
  street: {
    label: "Street",
    emoji: "🗺️",
    style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  terrain: {
    label: "Terrain",
    emoji: "🏔️",
    style: rasterStyle(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      "Tiles © Esri"
    ),
  },
} as const;

type TileLayerKey = keyof typeof TILE_LAYERS;

function getZoomFromRadius(radiusKm: number): number {
  if (radiusKm < 0.5) return 16;
  if (radiusKm < 2) return 14;
  if (radiusKm < 10) return 13;
  if (radiusKm < 50) return 11;
  if (radiusKm < 200) return 8;
  return 5;
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir},  ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

interface PopupState {
  lat: number;
  lng: number;
  label: string;
  isAlt: boolean;
  altIndex?: number;
  confidence?: number;
}

type ActiveView = "map" | "streetview";

interface MapViewProps {
  result: GeoResult | null;
  state: AnalysisState;
}

export default function MapView({ result, state }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanIndexRef = useRef(0);

  const [activeLayer, setActiveLayer] = useState<TileLayerKey>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light"
        ? "street"
        : "dark";
    }
    return "dark";
  });

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const [popupInfo, setPopupInfo] = useState<PopupState | null>(null);
  const [scanLabel, setScanLabel] = useState("");
  const [scanCoords, setScanCoords] = useState({ lat: 0, lng: 0 });

  // ── Globe-scanning animation during analysis ──
  useEffect(() => {
    if (state !== "analyzing") {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    // Shuffle scan order
    const shuffled = [...SCAN_LOCATIONS].sort(() => Math.random() - 0.5);
    scanIndexRef.current = 0;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const flyDuration = isMobile ? 1000 : 1600;
    const scanInterval = isMobile ? 3200 : 2600;

    const flyNext = () => {
      const loc = shuffled[scanIndexRef.current % shuffled.length];
      scanIndexRef.current++;
      setScanLabel(loc.label);
      setScanCoords({ lat: loc.lat, lng: loc.lng });
      mapRef.current?.flyTo({
        center: [loc.lng, loc.lat],
        zoom: loc.zoom,
        duration: flyDuration,
        essential: true,
      });
    };

    // Fly to world view first, then start scanning
    mapRef.current?.flyTo({ center: [0, 20], zoom: 2, duration: 500, essential: true });
    const kickoff = setTimeout(flyNext, 600);
    scanIntervalRef.current = setInterval(flyNext, scanInterval);

    return () => {
      clearTimeout(kickoff);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [state]);

  // Fly to new location when result changes
  useEffect(() => {
    if (!result) return;
    const { lat, lng } = result.location.coordinates;
    const zoom = getZoomFromRadius(result.location.radius_km);
    setPopupInfo(null);
    const t = setTimeout(() => {
      const dur = typeof window !== "undefined" && window.innerWidth < 640 ? 900 : 1400;
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: dur, essential: true });
    }, 50);
    return () => clearTimeout(t);
  }, [result?.location.coordinates.lat, result?.location.coordinates.lng]); // eslint-disable-line

  // Reset to map view when result changes
  useEffect(() => {
    setActiveView("map");
  }, [result?.location.coordinates.lat, result?.location.coordinates.lng]); // eslint-disable-line

  const handleCopyCoords = useCallback(() => {
    if (!result) return;
    const { lat, lng } = result.location.coordinates;
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleRecenter = useCallback(() => {
    if (!result) return;
    const { lat, lng } = result.location.coordinates;
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: getZoomFromRadius(result.location.radius_km),
      duration: 1000,
      essential: true,
    });
  }, [result]);

  const layer = TILE_LAYERS[activeLayer];

  const lat = result?.location.coordinates.lat ?? 20;
  const lng = result?.location.coordinates.lng ?? 0;
  const zoom = result ? getZoomFromRadius(result.location.radius_km) : 2;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const locationLabel = result
    ? [result.location.landmark, result.location.city, result.location.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl flex flex-col h-[380px] sm:h-[460px] lg:h-[520px]">

      {/* Rainbow top strip */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 via-cyan-400 to-emerald-400 shrink-0" />

      {/* ── Tab bar (only when result exists) ── */}
      {result && (
        <div className="flex items-center gap-1 bg-zinc-950 border-b border-zinc-800/60 px-3 py-2 shrink-0">
          <button
            onClick={() => setActiveView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === "map"
                ? "bg-blue-500/15 text-blue-300 border border-blue-500/25"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            Map
          </button>
          <button
            onClick={() => setActiveView("streetview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === "streetview"
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
            </svg>
            Street View
          </button>
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-zinc-600 hidden sm:block">
            {lat.toFixed(4)}°, {lng.toFixed(4)}°
          </span>
        </div>
      )}

      {/* ── Content area ── */}
      <div className="relative flex-1 min-h-0">

        {/* MAP VIEW */}
        <div className={`absolute inset-0 ${activeView === "map" ? "block" : "hidden"}`}>
          <Map
            ref={mapRef}
            initialViewState={{ longitude: lng, latitude: lat, zoom }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={layer.style as string}
            attributionControl={result ? { compact: true } : false}
            dragRotate={false}
            touchPitch={false}
          >
            {result && (
              <>
                <NavigationControl position="bottom-right" showCompass={false} />
                <ScaleControl position="bottom-left" unit="metric" />

                {/* Primary pulsing marker */}
                <Marker
                  longitude={result.location.coordinates.lng}
                  latitude={result.location.coordinates.lat}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setPopupInfo({
                      lat: result.location.coordinates.lat,
                      lng: result.location.coordinates.lng,
                      label: result.location.landmark || result.location.city || result.location.country,
                      isAlt: false,
                      confidence: result.location.confidence,
                    });
                  }}
                >
                  <div style={{ position: "relative", width: 48, height: 48, cursor: "pointer" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(59,130,246,0.12)", animation: "georipple 2.2s ease-out infinite" }} />
                    <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(59,130,246,0.18)", animation: "georipple 2.2s ease-out infinite 0.5s" }} />
                    <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "#3b82f6", border: "3px solid #fff", boxShadow: "0 0 24px rgba(59,130,246,0.9),0 4px 16px rgba(0,0,0,0.5)" }} />
                  </div>
                </Marker>

                {/* Alt markers */}
                {result.alternatives.map((alt, index) => (
                  <Marker
                    key={index}
                    longitude={alt.coordinates.lng}
                    latitude={alt.coordinates.lat}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setPopupInfo({
                        lat: alt.coordinates.lat,
                        lng: alt.coordinates.lng,
                        label: [alt.city, alt.region, alt.country].filter(Boolean).join(", "),
                        isAlt: true,
                        altIndex: index,
                        confidence: alt.confidence,
                      });
                    }}
                  >
                    <div style={{ width: 26, height: 26, background: "#27272a", border: "2px solid #52525b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#a1a1aa", boxShadow: "0 2px 10px rgba(0,0,0,0.6)", cursor: "pointer", fontFamily: "system-ui,sans-serif" }}>
                      {index + 1}
                    </div>
                  </Marker>
                ))}

                {/* Popup */}
                {popupInfo && (
                  <Popup
                    longitude={popupInfo.lng}
                    latitude={popupInfo.lat}
                    anchor="bottom"
                    onClose={() => setPopupInfo(null)}
                    closeButton
                    maxWidth="280px"
                    offset={20}
                  >
                    <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                      {popupInfo.isAlt && (
                        <p style={{ fontSize: 10, color: "#71717a", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Alternative {(popupInfo.altIndex ?? 0) + 1}
                        </p>
                      )}
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#fafafa", marginBottom: 4 }}>{popupInfo.label}</p>
                      {popupInfo.confidence !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "#3f3f46", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${popupInfo.confidence}%`, background: popupInfo.confidence >= 70 ? "#22c55e" : popupInfo.confidence >= 40 ? "#eab308" : "#ef4444", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{popupInfo.confidence}%</span>
                        </div>
                      )}
                      {!popupInfo.isAlt && (
                        <>
                          <p style={{ fontSize: 11, color: "#71717a", fontFamily: "monospace", marginBottom: 10 }}>
                            {popupInfo.lat.toFixed(5)}°, {popupInfo.lng.toFixed(5)}°
                          </p>
                          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#60a5fa", textDecoration: "none", background: "rgba(59,130,246,0.1)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.2)" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Open in Google Maps
                          </a>
                        </>
                      )}
                    </div>
                  </Popup>
                )}
              </>
            )}
          </Map>

          {/* No result overlay */}
          {!result && state === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-6 py-4 text-center shadow-2xl">
                <div className="text-3xl mb-2">🌍</div>
                <p className="text-sm font-medium text-zinc-300">Upload an image to detect location</p>
                <p className="text-xs text-zinc-600 mt-1">The pin will appear here</p>
              </div>
            </div>
          )}

          {/* ── AI Scanning overlay ── */}
          {state === "analyzing" && (
            <div className="absolute inset-0 z-[500] pointer-events-none">
              {/* Subtle blue grid */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }} />

              {/* Corner scan brackets */}
              {[
                { top: 12, left: 12, borderTop: "2px solid rgba(59,130,246,0.8)", borderLeft: "2px solid rgba(59,130,246,0.8)" },
                { top: 12, right: 12, borderTop: "2px solid rgba(59,130,246,0.8)", borderRight: "2px solid rgba(59,130,246,0.8)" },
                { bottom: 12, left: 12, borderBottom: "2px solid rgba(59,130,246,0.8)", borderLeft: "2px solid rgba(59,130,246,0.8)" },
                { bottom: 12, right: 12, borderBottom: "2px solid rgba(59,130,246,0.8)", borderRight: "2px solid rgba(59,130,246,0.8)" },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
              ))}

              {/* Crosshair in visual center */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: 72, height: 72 }}>
                  {/* pulsing rings */}
                  <div style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(59,130,246,0.7)", borderRadius: "50%", animation: "scan-ring 1.6s ease-out infinite" }} />
                  <div style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(59,130,246,0.4)", borderRadius: "50%", animation: "scan-ring 1.6s ease-out infinite 0.55s" }} />
                  <div style={{ position: "absolute", inset: 0, border: "1.5px solid rgba(59,130,246,0.2)", borderRadius: "50%", animation: "scan-ring 1.6s ease-out infinite 1.1s" }} />
                  {/* crosshair lines */}
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(59,130,246,0.7)", transform: "translateY(-50%)" }} />
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(59,130,246,0.7)", transform: "translateX(-50%)" }} />
                  {/* center dot */}
                  <div style={{ position: "absolute", inset: "50%", width: 6, height: 6, margin: "-3px", borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 10px rgba(59,130,246,0.9)" }} />
                </div>
              </div>

              {/* Top status badge */}
              <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "rgba(9,9,11,0.88)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: 20, padding: "5px 14px", backdropFilter: "blur(8px)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6", animation: "blink 1s ease-in-out infinite" }} />
                <span style={{ fontSize: 10, color: "#93c5fd", fontWeight: 700, letterSpacing: "0.12em" }}>AI SCANNING · {scanLabel || "GLOBE"}</span>
              </div>

              {/* Bottom coordinate readout */}
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(9,9,11,0.88)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: "5px 12px", backdropFilter: "blur(8px)", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "#3b82f6", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 2 }}>CANDIDATE COORDINATES</p>
                <p style={{ fontSize: 11, color: "#93c5fd", fontFamily: "monospace", fontWeight: 600 }}>
                  {Math.abs(scanCoords.lat).toFixed(4)}° {scanCoords.lat >= 0 ? "N" : "S"} &nbsp;
                  {Math.abs(scanCoords.lng).toFixed(4)}° {scanCoords.lng >= 0 ? "E" : "W"}
                </p>
              </div>
            </div>
          )}

          {/* Layer switcher */}
          <div className="absolute top-3 right-3 z-[1000]">
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu((p) => !p)}
                className="flex items-center gap-1.5 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-2 rounded-lg shadow-xl hover:border-zinc-500 hover:text-white transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                </svg>
                {TILE_LAYERS[activeLayer].emoji} {TILE_LAYERS[activeLayer].label}
              </button>
              {showLayerMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-zinc-900/98 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[130px]">
                  {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setActiveLayer(key); setShowLayerMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                        activeLayer === key ? "bg-blue-500/15 text-blue-400" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <span>{TILE_LAYERS[key].emoji}</span>
                      <span>{TILE_LAYERS[key].label}</span>
                      {activeLayer === key && (
                        <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recenter button */}
          {result && (
            <button
              onClick={handleRecenter}
              title="Recenter map"
              className="absolute z-[1000] flex items-center justify-center w-8 h-8 bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-lg hover:border-zinc-500 transition-all"
              style={{ bottom: 80, right: 12 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
          )}

          {/* Location info overlay */}
          {result && (
            <div className="absolute bottom-8 left-3 right-14 z-[1000] pointer-events-none">
              <div className="inline-flex items-center gap-3 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl px-4 py-2.5 shadow-2xl pointer-events-auto max-w-full">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: result.location.confidence >= 70 ? "#22c55e" : result.location.confidence >= 40 ? "#eab308" : "#ef4444",
                    boxShadow: `0 0 8px ${result.location.confidence >= 70 ? "#22c55e" : result.location.confidence >= 40 ? "#eab308" : "#ef4444"}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {result.location.landmark || result.location.city || result.location.country}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">{formatCoords(lat, lng)}</p>
                </div>
                <span
                  className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: result.location.confidence >= 70 ? "rgba(34,197,94,0.1)" : result.location.confidence >= 40 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                    color: result.location.confidence >= 70 ? "#22c55e" : result.location.confidence >= 40 ? "#eab308" : "#ef4444",
                  }}
                >
                  {result.location.confidence}%
                </span>
                <button onClick={handleCopyCoords} title="Copy coordinates" className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors">
                  {copied ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps" className="shrink-0 text-zinc-500 hover:text-blue-400 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          )}

          {/* MapLibre control + marker animation styles */}
          <style>{`
            @keyframes georipple {
              0%  { transform: scale(.7); opacity: .9; }
              100%{ transform: scale(2.4); opacity: 0; }
            }
            @keyframes scan-ring {
              0%   { transform: scale(0.6); opacity: 0.9; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.3; }
            }
            .maplibregl-popup-content {
              background: #18181b !important;
              color: #fafafa !important;
              border: 1px solid #3f3f46 !important;
              border-radius: 12px !important;
              box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
              padding: 14px 16px !important;
            }
            .maplibregl-popup-tip { border-top-color: #18181b !important; }
            .maplibregl-popup-close-button { color: #71717a !important; font-size: 18px !important; top: 6px !important; right: 8px !important; background: transparent !important; }
            .maplibregl-popup-close-button:hover { color: #fafafa !important; }
            .maplibregl-ctrl-attrib { font-size: 9px !important; border-radius: 6px 0 0 0 !important; opacity: 0.5 !important; }
            .maplibregl-ctrl-group { border-radius: 8px !important; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; border: 1px solid #3f3f46 !important; }
            .maplibregl-ctrl-group button { background: #18181b !important; border-bottom: 1px solid #3f3f46 !important; width: 30px !important; height: 30px !important; }
            .maplibregl-ctrl-group button:hover { background: #27272a !important; }
            .maplibregl-ctrl-group button .maplibregl-ctrl-icon { filter: invert(0.7); }
            .maplibregl-ctrl-scale { background: rgba(9,9,11,0.8) !important; border-color: #52525b !important; color: #71717a !important; font-size: 10px !important; padding: 1px 5px !important; }
          `}</style>
        </div>

        {/* MAPILLARY STREET VIEW */}
        {activeView === "streetview" && result && (
          <MapillaryPanel lat={lat} lng={lng} locationLabel={locationLabel} />
        )}
      </div>
    </div>
  );
}
