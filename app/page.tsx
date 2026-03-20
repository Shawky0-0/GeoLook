"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { AlertCircle, RefreshCw, Sparkles, ScanSearch } from "lucide-react";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ResultsPanel from "@/components/ResultsPanel";
import PlaceInfo from "@/components/PlaceInfo";
import ExamplePlaces from "@/components/ExamplePlaces";
import TerminalDemo from "@/components/TerminalDemo";
import { GeoResult, AnalysisState } from "@/types";
import { getPlaceInfo, WikiInfo } from "@/lib/wikipedia";
import { compressImageForUpload } from "@/lib/compress";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 h-[380px] sm:h-[460px] lg:h-[520px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-600">
        <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-zinc-700 animate-spin" />
        <span className="text-xs">Loading map…</span>
      </div>
    </div>
  ),
});

const LOADING_MESSAGES = [
  "Scanning architectural patterns…",
  "Analyzing vegetation & terrain…",
  "Reading signage & typography…",
  "Detecting cultural markers…",
  "Identifying landmarks…",
  "Cross-referencing geography…",
  "Calculating confidence score…",
];

export default function HomePage() {
  const [result, setResult] = useState<GeoResult | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number | undefined>(undefined);
  const [wikiInfo, setWikiInfo] = useState<WikiInfo | null>(null);

  // Fetch Wikipedia info whenever a result arrives
  useEffect(() => {
    if (!result || analysisState !== "done") return;
    setWikiInfo(null);
    let active = true;
    const { landmark, city, country, confidence } = result.location;
    getPlaceInfo(landmark, city, country, confidence)
      .then((info) => { if (active && info) setWikiInfo(info); })
      .catch(() => { /* non-critical */ });
    return () => { active = false; };
  }, [result, analysisState]);

  const handleAnalyze = useCallback(async (file: File) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setAnalysisState("analyzing");
    setError(null);
    setErrorSuggestion(null);
    setResult(null);
    setMapCenter(null);
    setSelectedAltIndex(undefined);

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[msgIndex]);
    }, 2000);

    try {
      const compressed = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append("image", compressed);
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const rawResponse = await response.text();
      let parsedData: Record<string, unknown> | null = null;

      try {
        const json = rawResponse ? JSON.parse(rawResponse) : null;
        parsedData =
          json && typeof json === "object" ? (json as Record<string, unknown>) : null;
      } catch {
        setError("Server returned an invalid response format.");
        setErrorSuggestion(
          "This usually means the server returned an HTML error page. Check terminal logs and restart the dev server."
        );
        setAnalysisState("error");
        return;
      }

      if (!response.ok) {
        const apiError =
          typeof parsedData?.error === "string"
            ? parsedData.error
            : "Analysis failed. Please try again.";
        const suggestion =
          typeof parsedData?.suggestion === "string"
            ? parsedData.suggestion
            : "Try a clearer outdoor photo with identifiable landmarks.";

        setError(apiError);
        setErrorSuggestion(suggestion);
        setAnalysisState("error");
        return;
      }

      if (!parsedData || typeof parsedData.location !== "object") {
        setError("Analysis response is missing location data.");
        setErrorSuggestion("Check server logs and verify API key/model settings.");
        setAnalysisState("error");
        return;
      }

      setResult(parsedData as unknown as GeoResult);
      setAnalysisState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Check your connection.");
      setErrorSuggestion("Make sure the server is running and your API key is configured.");
      setAnalysisState("error");
    } finally {
      clearInterval(msgInterval);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setAnalysisState("idle");
    setError(null);
    setErrorSuggestion(null);
    setMapCenter(null);
    setSelectedAltIndex(undefined);
    setWikiInfo(null);
  }, []);

  const handleSelectAlternative = useCallback((lat: number, lng: number, index: number) => {
    setMapCenter({ lat, lng });
    setSelectedAltIndex(index);
  }, []);

  const isAnalyzing = analysisState === "analyzing";

  const mapResult = result && mapCenter
    ? { ...result, location: { ...result.location, coordinates: mapCenter } }
    : result;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-hidden">

      {/* ── Ambient background orbs ── */}
      <div className="orb-blue w-[700px] h-[700px] top-[-250px] left-[-200px] opacity-70" />
      <div className="orb-purple w-[600px] h-[600px] top-[50px] right-[-200px] opacity-50" />
      <div className="orb-cyan w-[500px] h-[500px] bottom-[-100px] left-[20%] opacity-40" />
      <div className="orb-purple w-[400px] h-[400px] bottom-[200px] right-[10%] opacity-30" />

      {/* ── Grid overlay ── */}
      <div className="geo-grid absolute inset-0 pointer-events-none" />

      {/* ── Vignette edges ── */}
      <div className="vignette-overlay absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,11,0.8)_100%)] pointer-events-none" />

      <Header />

      <main className="relative flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* ════════════════ HERO (idle only) ════════════════ */}
        {analysisState === "idle" && (
          <div className="relative text-center mb-10 animate-fade-up overflow-hidden">

            {/* ── Hero ambient background ── */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>

              {/* Dot grid pattern */}
              <div className="hero-dots absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle, rgba(96,165,250,0.35) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
                WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
                maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
              }} />

              {/* Color aurora behind the dots */}
              <div className="hero-aurora absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: "90%", height: "90%",
                  background: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.14) 40%, rgba(6,182,212,0.16) 100%)",
                  backgroundSize: "200% 200%",
                  filter: "blur(48px)",
                  animation: "auroraShift 12s ease-in-out infinite",
                  borderRadius: "50%",
                }}
              />

              {/* Floating coords */}
              {[
                { text: "48.8566°N · 2.3522°E",  left: "2%",  top: "10%", delay: "0s"   },
                { text: "35.6762°N · 139.65°E",  left: "66%", top: "6%",  delay: "3s"   },
                { text: "40.7128°N · 74.006°W",  left: "72%", top: "82%", delay: "1.5s" },
                { text: "51.5074°N · 0.1278°W",  left: "1%",  top: "82%", delay: "4.5s" },
              ].map(({ text, left, top, delay }, i) => (
                <span key={i} className="hero-coord absolute font-mono text-[8px] tabular-nums hidden sm:block"
                  style={{ left, top, color: "rgba(148,163,184,0.30)", animation: `heroCoordFloat 9s ease-in-out ${delay} infinite` }}>
                  {text}
                </span>
              ))}
            </div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Geolocation Engine
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-5">
              <span className="gradient-text">Where</span>
              <span className="text-white"> in the </span>
              <br />
              <span className="text-white">world </span>
              <span className="gradient-text">is this?</span>
            </h1>

            <p className="text-zinc-400 text-lg max-w-lg mx-auto mb-8 leading-relaxed">
              Drop any photo. Our AI vision engine reads architecture, signage,
              vegetation, and landmarks to pinpoint its exact location on Earth.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-10">
              {[
                { value: "190+", label: "Countries", color: "from-blue-400 to-cyan-400" },
                { value: "AI", label: "Vision Model", color: "from-violet-400 to-purple-500" },
                { value: "~5s", label: "Avg. Speed", color: "from-pink-400 to-rose-500" },
              ].map((stat) => (
                <div key={stat.label} className="text-center px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className={`text-2xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Scrolling example places */}
            <ExamplePlaces />
          </div>
        )}

        {/* ════════════════ TOP HEADER (active state) ════════════════ */}
        {analysisState !== "idle" && (
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-zinc-300">
                {isAnalyzing ? "Analyzing image…" : analysisState === "done" ? "Location detected" : "Analysis failed"}
              </h2>
            </div>
            {(analysisState === "done" || analysisState === "error") && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg hover:border-zinc-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Analysis
              </button>
            )}
          </div>
        )}

        {/* ════════════════ MAIN GRID ════════════════ */}
        <div className={analysisState !== "idle"
          ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
          : "max-w-xl mx-auto"
        }>
          {/* ── Left column: Upload ── */}
          <div className="space-y-4 lg:col-span-1">

            {/* Upload card */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
              <div className="h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500" />
              <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                  <ScanSearch className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-100">Scan Image</h2>
              </div>
              <ImageUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              </div>
            </div>

            {/* Loading card */}
            {isAnalyzing && (
              <div className="glass-card rounded-2xl p-5 animate-fade-in">
                {/* Radar */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-12 h-12 shrink-0">
                    {/* Rings */}
                    <div className="absolute inset-0 rounded-full border border-blue-500/20" />
                    <div className="absolute inset-[4px] rounded-full border border-blue-500/30" />
                    <div className="absolute inset-[8px] rounded-full border border-blue-500/20" />
                    {/* Sweep */}
                    <div className="absolute inset-0 rounded-full radar-sweep" />
                    {/* Center dot */}
                    <div className="absolute inset-[10px] rounded-full bg-blue-500/80 glow-blue-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 mb-0.5">AI Analyzing…</p>
                    <p className="text-xs text-blue-400 animate-pulse truncate">{loadingMessage}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full progress-bar" />
                </div>
              </div>
            )}

            {/* Error card */}
            {analysisState === "error" && error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-1">Analysis Failed</p>
                    <p className="text-sm text-red-400/80">{error}</p>
                    {errorSuggestion && (
                      <p className="text-xs text-zinc-600 mt-2">{errorSuggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: Map (2/3 width) ── */}
          {analysisState !== "idle" && (
            <div className="lg:col-span-2">
              <MapView result={mapResult} state={analysisState} />
            </div>
          )}
        </div>

        {/* ════════════════ RESULTS PANEL ════════════════ */}
        {(analysisState === "done" && result) || analysisState === "analyzing" ? (
          <div className="mt-6">
            <ResultsPanel
              result={result}
              state={analysisState}
              onSelectAlternative={handleSelectAlternative}
              selectedAltIndex={selectedAltIndex}
            />
          </div>
        ) : null}

        {/* ════════════════ PLACE INFO (Wikipedia + Live Data) ════════════════ */}
        {wikiInfo && analysisState === "done" && result && (
          <div className="mt-4">
            <PlaceInfo
              info={wikiInfo}
              coordinates={result.location.coordinates}
              country={result.location.country}
            />
          </div>
        )}

        {/* ════════════════ TERMINAL DEMO (idle only) ════════════════ */}
        {analysisState === "idle" && (
          <div className="mt-10 animate-fade-up">
            <p className="text-center text-xs text-zinc-600 mb-3 uppercase tracking-widest">What the AI sees</p>
            <TerminalDemo />
          </div>
        )}

        {/* ════════════════ OLD FEATURE CARDS — removed ════════════════ */}
        {false && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto animate-fade-up">
            {[
              {
                accent: "from-blue-500 to-cyan-400",
                glow: "59,130,246",
                iconPath: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v4M12 10v4M16 10v4"/>
                  </svg>
                ),
                title: "Architecture",
                subtitle: "Building Intelligence",
                points: ["Building styles & eras", "Urban layout patterns", "Construction materials"],
                iconColor: "rgba(59,130,246,0.12)",
                borderColor: "rgba(59,130,246,0.18)",
              },
              {
                accent: "from-violet-500 to-pink-400",
                glow: "139,92,246",
                iconPath: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                  </svg>
                ),
                title: "Visual Cues",
                subtitle: "Signs & Culture",
                points: ["Street signs & plates", "Vegetation & climate", "Cultural markers"],
                iconColor: "rgba(139,92,246,0.12)",
                borderColor: "rgba(139,92,246,0.18)",
              },
              {
                accent: "from-emerald-500 to-teal-400",
                glow: "16,185,129",
                iconPath: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/>
                  </svg>
                ),
                title: "Live Map Pin",
                subtitle: "Geolocation Output",
                points: ["GPS coordinates", "Accuracy radius", "Street-level view"],
                iconColor: "rgba(16,185,129,0.12)",
                borderColor: "rgba(16,185,129,0.18)",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(24,24,27,0.7)",
                  border: `1px solid ${f.borderColor}`,
                  boxShadow: `0 0 0 0 rgba(${f.glow},0)`,
                  animationDelay: `${i * 100}ms`,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 8px 32px rgba(${f.glow},0.18)`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 rgba(${f.glow},0)`)}
              >
                {/* Gradient accent bar */}
                <div className={`h-[2px] bg-gradient-to-r ${f.accent}`} />

                {/* Subtle inner glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(${f.glow},0.08) 0%, transparent 70%)` }} />

                <div className="p-5">
                  {/* Icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: f.iconColor, border: `1px solid ${f.borderColor}` }}>
                      {f.iconPath}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100 leading-tight">{f.title}</p>
                      <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{f.subtitle}</p>
                    </div>
                  </div>

                  {/* Capability list */}
                  <ul className="space-y-1.5">
                    {f.points.map(pt => (
                      <li key={pt} className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${f.accent} shrink-0`} />
                        <span className="text-[11px] text-zinc-400">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-700">
            GeoLook — AI Geographic Intelligence
          </p>
          <p className="text-xs text-zinc-800">
            Powered by Shawky
          </p>
        </div>
      </footer>
    </div>
  );
}
