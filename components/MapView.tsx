"use client";

import { useEffect, useState, useCallback } from "react";
import StreetViewPanel from "./StreetViewPanel";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoResult } from "@/types";

const EMBEDDED_STREET_VIEW_ENABLED = true;

// Fix Leaflet default icon paths
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
};

const TILE_LAYERS = {
  dark: {
    label: "Dark",
    emoji: "🌑",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  satellite: {
    label: "Satellite",
    emoji: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS",
    subdomains: "",
  },
  street: {
    label: "Street",
    emoji: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
  },
} as const;

type TileLayerKey = keyof typeof TILE_LAYERS;

// Animated pulse primary marker
const createPrimaryIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:48px;height:48px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(59,130,246,0.12);
          animation:georipple 2.2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;inset:8px;border-radius:50%;
          background:rgba(59,130,246,0.18);
          animation:georipple 2.2s ease-out infinite 0.5s;
        "></div>
        <div style="
          position:absolute;inset:14px;border-radius:50%;
          background:#3b82f6;
          border:3px solid #fff;
          box-shadow:0 0 24px rgba(59,130,246,0.9),0 4px 16px rgba(0,0,0,0.5);
        "></div>
        <style>
          @keyframes georipple{
            0%{transform:scale(.7);opacity:.9}
            100%{transform:scale(2.4);opacity:0}
          }
        </style>
      </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -28],
  });

const createAltIcon = (index: number) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width:26px;height:26px;
        background:#27272a;
        border:2px solid #52525b;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:#a1a1aa;
        box-shadow:0 2px 10px rgba(0,0,0,0.6);
        font-family:system-ui,sans-serif;
      ">${index + 1}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });

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

// Internal component: updates map view when result changes
function MapController({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.4, easeLinearity: 0.3 });
  }, [map, lat, lng, zoom]);
  return null;
}

// Internal component: recenter button
function RecenterButton({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo([lat, lng], zoom, { animate: true, duration: 1 })}
      title="Recenter map"
      style={{
        position: "absolute",
        bottom: 80,
        right: 10,
        zIndex: 1000,
        width: 34,
        height: 34,
        background: "#18181b",
        border: "1px solid #3f3f46",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="22" y2="12"/>
      </svg>
    </button>
  );
}

type ActiveView = "map" | "streetview";

interface MapViewProps {
  result: GeoResult | null;
}

export default function MapView({ result }: MapViewProps) {
  const [activeLayer, setActiveLayer] = useState<TileLayerKey>("dark");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("map");
  const canUseEmbeddedStreetView =
    EMBEDDED_STREET_VIEW_ENABLED && Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const handleCopyCoords = useCallback(() => {
    if (!result) return;
    const { lat, lng } = result.location.coordinates;
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  // Reset to map view when result changes
  useEffect(() => {
    setActiveView("map");
  }, [result?.location.coordinates.lat, result?.location.coordinates.lng]);

  const layer = TILE_LAYERS[activeLayer];

  if (!result) {
    return (
      <div className="rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl flex flex-col h-[380px] sm:h-[460px] lg:h-[520px]">
        <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 shrink-0" />
        <div className="relative flex-1">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url={TILE_LAYERS.dark.url} subdomains="abcd" />
          </MapContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-6 py-4 text-center shadow-2xl">
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-sm font-medium text-zinc-300">Upload an image to detect location</p>
              <p className="text-xs text-zinc-600 mt-1">The pin will appear here</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { location, alternatives } = result;
  const { lat, lng } = location.coordinates;
  const zoom = getZoomFromRadius(location.radius_km);
  const radiusMeters = location.radius_km * 1000;

  const locationLabel = [location.landmark, location.city, location.country]
    .filter(Boolean)
    .join(", ");

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const streetViewOpenUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m1!1e3`;
  const mapillaryUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17`;

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-800/60 shadow-2xl flex flex-col h-[380px] sm:h-[460px] lg:h-[520px]">

      {/* Rainbow top strip */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 via-cyan-400 to-emerald-400 shrink-0" />

      {/* ── Tab bar ── */}
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

      {/* ── Content area ── */}
      <div className="relative flex-1">

        {/* MAP VIEW */}
        <div className={`absolute inset-0 ${activeView === "map" ? "block" : "hidden"}`}>
          <MapContainer
            center={[lat, lng]}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={true}
          >
            <TileLayer
              key={activeLayer}
              url={layer.url}
              attribution={layer.attribution}
              subdomains={layer.subdomains || "abc"}
              maxZoom={20}
            />
            <ScaleControl position="bottomleft" />
            <MapController lat={lat} lng={lng} zoom={zoom} />
            <RecenterButton lat={lat} lng={lng} zoom={zoom} />

            {radiusMeters > 0 && radiusMeters < 5_000_000 && (
              <Circle
                center={[lat, lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.07,
                  weight: 1.5,
                  dashArray: "6 5",
                }}
              />
            )}

            <Marker position={[lat, lng]} icon={createPrimaryIcon()}>
              <Popup minWidth={220} maxWidth={280}>
                <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#fafafa", marginBottom: 4 }}>
                    {location.landmark || location.city || location.country}
                  </p>
                  <p style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 8 }}>{locationLabel}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 4, background: "#3f3f46", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${location.confidence}%`, background: location.confidence >= 70 ? "#22c55e" : location.confidence >= 40 ? "#eab308" : "#ef4444", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{location.confidence}%</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#71717a", fontFamily: "monospace", marginBottom: 10 }}>
                    {lat.toFixed(5)}°, {lng.toFixed(5)}°
                  </p>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#60a5fa", textDecoration: "none", background: "rgba(59,130,246,0.1)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>

            {alternatives.map((alt, index) => (
              <Marker
                key={index}
                position={[alt.coordinates.lat, alt.coordinates.lng]}
                icon={createAltIcon(index)}
              >
                <Popup minWidth={180}>
                  <div style={{ fontFamily: "system-ui,sans-serif", padding: "2px 0" }}>
                    <p style={{ fontSize: 10, color: "#71717a", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Alternative {index + 1}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fafafa", marginBottom: 6 }}>
                      {alt.city || alt.region}, {alt.country}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 3, background: "#3f3f46", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${alt.confidence}%`, background: "#6b7280", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#71717a" }}>{alt.confidence}%</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

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

          {/* Location info overlay */}
          <div className="absolute bottom-8 left-3 right-14 z-[1000] pointer-events-none">
            <div className="inline-flex items-center gap-3 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl px-4 py-2.5 shadow-2xl pointer-events-auto max-w-full">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: location.confidence >= 70 ? "#22c55e" : location.confidence >= 40 ? "#eab308" : "#ef4444",
                  boxShadow: `0 0 8px ${location.confidence >= 70 ? "#22c55e" : location.confidence >= 40 ? "#eab308" : "#ef4444"}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {location.landmark || location.city || location.country}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{formatCoords(lat, lng)}</p>
              </div>
              <span
                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: location.confidence >= 70 ? "rgba(34,197,94,0.1)" : location.confidence >= 40 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                  color: location.confidence >= 70 ? "#22c55e" : location.confidence >= 40 ? "#eab308" : "#ef4444",
                }}
              >
                {location.confidence}%
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

          <style>{`
            .leaflet-control-zoom { border: 1px solid #3f3f46 !important; border-radius: 8px !important; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; }
            .leaflet-control-zoom a { background: #18181b !important; color: #a1a1aa !important; border-bottom: 1px solid #3f3f46 !important; width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 16px !important; }
            .leaflet-control-zoom a:hover { background: #27272a !important; color: #fafafa !important; }
            .leaflet-control-zoom-in { border-radius: 0 !important; }
            .leaflet-control-zoom-out { border-radius: 0 !important; border-bottom: none !important; }
            .leaflet-control-scale-line { background: rgba(9,9,11,0.8) !important; border-color: #52525b !important; color: #71717a !important; font-size: 10px !important; padding: 1px 5px !important; }
            .leaflet-control-attribution { font-size: 9px !important; border-radius: 6px 0 0 0 !important; opacity: 0.5 !important; }
          `}</style>
        </div>

        {/* STREET VIEW */}
        {activeView === "streetview" && (
          canUseEmbeddedStreetView ? (
            <StreetViewPanel
              lat={lat}
              lng={lng}
              locationLabel={locationLabel}
              streetViewOpenUrl={streetViewOpenUrl}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col bg-zinc-950">
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="10" r="3"/>
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">Street View Ready Without Billing Popup</h3>
                  <p className="text-sm text-zinc-400 mb-5">
                    Embedded Google Street View is off, so the app won&apos;t show the Google key/billing error dialog.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <a
                      href={streetViewOpenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                      Open Google Street View
                    </a>
                    <a
                      href={mapillaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-zinc-700"
                    >
                      Open Mapillary
                    </a>
                  </div>
                  <p className="text-xs text-zinc-600 mt-4">
                    To re-enable embedded Google mode later, set <code>NEXT_PUBLIC_ENABLE_EMBEDDED_STREET_VIEW=true</code>.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
