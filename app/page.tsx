"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { AlertCircle, RefreshCw, Sparkles, ScanSearch } from "lucide-react";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ResultsPanel from "@/components/ResultsPanel";
import { GeoResult, AnalysisState } from "@/types";

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

  const handleAnalyze = useCallback(async (file: File) => {
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
      const formData = new FormData();
      formData.append("image", file);
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(9,9,11,0.8)_100%)] pointer-events-none" />

      <Header />

      <main className="relative flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* ════════════════ HERO (idle only) ════════════════ */}
        {analysisState === "idle" && (
          <div className="text-center mb-10 animate-fade-up">
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
              <MapView result={mapResult} />
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

        {/* ════════════════ FEATURE CARDS (idle only) ════════════════ */}
        {analysisState === "idle" && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto animate-fade-up">
            {[
              {
                icon: "🏛️",
                title: "Architecture Analysis",
                desc: "Identifies building styles, urban patterns, and construction eras",
                topBar: "from-blue-500 via-cyan-400 to-blue-400",
                iconBg: "bg-blue-500/10 border-blue-500/20",
                hover: "hover:border-blue-500/30 hover:shadow-blue-500/10",
              },
              {
                icon: "🔍",
                title: "Visual Cue Detection",
                desc: "Reads signs, plates, vegetation, climate, and cultural markers",
                topBar: "from-violet-500 via-purple-500 to-pink-400",
                iconBg: "bg-violet-500/10 border-violet-500/20",
                hover: "hover:border-violet-500/30 hover:shadow-violet-500/10",
              },
              {
                icon: "📍",
                title: "Live Map Pin",
                desc: "Places result on an interactive map with accuracy radius",
                topBar: "from-cyan-500 via-teal-400 to-emerald-400",
                iconBg: "bg-cyan-500/10 border-cyan-500/20",
                hover: "hover:border-cyan-500/30 hover:shadow-cyan-500/10",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`glass-card rounded-2xl overflow-hidden text-center group ${f.hover} transition-all duration-300 hover:shadow-lg`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`h-[2px] bg-gradient-to-r ${f.topBar}`} />
                <div className="p-5">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border ${f.iconBg} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-2xl">{f.icon}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-1">{f.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{f.desc}</p>
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
            Powered by OpenRouter · Maps by OpenStreetMap & Google
          </p>
        </div>
      </footer>
    </div>
  );
}
