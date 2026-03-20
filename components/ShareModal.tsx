"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Share2, FileText } from "lucide-react";
import { GeoResult } from "@/types";

interface Props {
  result: GeoResult;
  onClose: () => void;
}

function buildShareUrl(result: GeoResult): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://geolook.vercel.app";
  const { location } = result;
  const params = new URLSearchParams({
    lat: location.coordinates.lat.toFixed(6),
    lng: location.coordinates.lng.toFixed(6),
    place: [location.landmark, location.city, location.country].filter(Boolean).join(", "),
    conf: String(location.confidence),
    country: location.country,
  });
  return `${base}/share?${params.toString()}`;
}

function buildShareText(result: GeoResult): string {
  const { location } = result;
  const place = [location.landmark, location.city, location.country].filter(Boolean).join(", ");
  const lat = Math.abs(location.coordinates.lat).toFixed(4);
  const lng = Math.abs(location.coordinates.lng).toFixed(4);
  const latDir = location.coordinates.lat >= 0 ? "N" : "S";
  const lngDir = location.coordinates.lng >= 0 ? "E" : "W";
  return `📍 GeoLook detected: ${place}\n🎯 Confidence: ${location.confidence}%\n🗺️ ${lat}°${latDir}, ${lng}°${lngDir}\n\nAnalyze your own photos → geolook.vercel.app`;
}

export default function ShareModal({ result, onClose }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Close on backdrop click or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareUrl = buildShareUrl(result);
  const shareText = buildShareText(result);
  const { location } = result;
  const placeName = [location.landmark, location.city, location.country].filter(Boolean).join(", ");

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `GeoLook — ${placeName}`,
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // User cancelled or not supported
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-slide-up"
        style={{ background: "#0f1015", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Top accent */}
        <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-zinc-100">Share Result</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location preview */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm">📍</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{placeName}</p>
              <p className="text-xs text-zinc-500">{location.confidence}% confidence</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2.5">
          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 hover:border-blue-500/35 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-zinc-100">{copiedLink ? "Copied!" : "Copy Link"}</p>
              <p className="text-xs text-zinc-500 truncate">{shareUrl}</p>
            </div>
          </button>

          {/* Copy text */}
          <button
            onClick={handleCopyText}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 hover:border-violet-500/35 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
              {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <FileText className="w-4 h-4 text-violet-400" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-100">{copiedText ? "Copied!" : "Copy as Text"}</p>
              <p className="text-xs text-zinc-500">Location, confidence & coordinates</p>
            </div>
          </button>

          {/* Native share (mobile) */}
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/35 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-100">Share…</p>
                <p className="text-xs text-zinc-500">Open native share menu</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
