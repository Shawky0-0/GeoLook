"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { MapPin, Camera, Clock, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface ExifPreview {
  camera?: string;
  timestamp?: string;
  hasGps: boolean;
  gpsLat?: number;
  gpsLng?: number;
}

interface ImageUploaderProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUploader({ onAnalyze, isAnalyzing }: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exifPreview, setExifPreview] = useState<ExifPreview | null>(null);
  const [loadingExif, setLoadingExif] = useState(false);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const extractClientExif = useCallback(async (file: File) => {
    setLoadingExif(true);
    try {
      const exifr = await import("exifr");
      const parsed = await exifr.default.parse(file, { gps: true, tiff: true, exif: true });
      if (!parsed) { setExifPreview({ hasGps: false }); return; }

      const hasGps = parsed.latitude !== undefined && parsed.longitude !== undefined;
      const make = parsed.Make || parsed.make;
      const model = parsed.Model || parsed.model;
      let camera: string | undefined;
      if (make && model) camera = `${make} ${model}`;
      else if (model) camera = String(model);
      else if (make) camera = String(make);

      let timestamp: string | undefined;
      const dt = parsed.DateTimeOriginal || parsed.DateTime || parsed.CreateDate;
      if (dt instanceof Date) {
        timestamp = dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      } else if (typeof dt === "string") {
        timestamp = dt;
      }

      setExifPreview({ camera, timestamp, hasGps, gpsLat: hasGps ? parsed.latitude : undefined, gpsLng: hasGps ? parsed.longitude : undefined });
    } catch {
      setExifPreview({ hasGps: false });
    } finally {
      setLoadingExif(false);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExifPreview(null);
    extractClientExif(file);
  }, [previewUrl, extractClientExif]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "image/gif": [".gif"], "image/heic": [".heic"], "image/heif": [".heif"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: isAnalyzing,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setExifPreview(null);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Drop Zone ── */}
      <div
        {...getRootProps()}
        className={clsx(
          "relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden group",
          isDragReject ? "border-red-500 bg-red-500/5"
            : isDragActive ? "border-blue-400 bg-blue-500/5 scale-[1.01]"
            : selectedFile ? "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
            : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-900/50",
          isAnalyzing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {/* Corner brackets — pointer-events-none so they never block clicks */}
        <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-blue-500/50 rounded-tl-sm z-10" />
        <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-blue-500/50 rounded-tr-sm z-10" />
        <div className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-blue-500/50 rounded-bl-sm z-10" />
        <div className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-blue-500/50 rounded-br-sm z-10" />

        {selectedFile && previewUrl ? (
          /* ── Preview State ── */
          <>
            <div className="relative aspect-video w-full overflow-hidden bg-zinc-950 scan-overlay">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            </div>

            {/* File info */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-white truncate max-w-[180px] drop-shadow">{selectedFile.name}</p>
                <p className="text-[10px] text-zinc-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {exifPreview?.hasGps && (
                <span className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/30">
                  <MapPin className="w-2.5 h-2.5" />
                  GPS Found
                </span>
              )}
            </div>

            {/* Clear button — needs pointer events */}
            {!isAnalyzing && (
              <button
                onClick={handleClear}
                className="absolute top-2 left-8 z-20 w-6 h-6 flex items-center justify-center bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors shadow-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          /* ── Empty / Drag State ── */
          <div className="pointer-events-none flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
              isDragActive ? "bg-blue-500/20 scale-110" : "bg-zinc-800/80"
            )}>
              {isDragActive
                ? <div className="w-7 h-7 border-2 border-blue-400 border-dashed rounded-lg animate-spin-slow" />
                : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )
              }
            </div>

            <p className={clsx("text-sm font-semibold mb-1", isDragActive ? "text-blue-300" : "text-zinc-200")}>
              {isDragActive ? "Release to scan" : isDragReject ? "File not supported" : "Drop image to scan"}
            </p>
            <p className="text-xs text-zinc-600">
              {isDragReject ? "Use JPEG, PNG, WebP, GIF or HEIC" : "or click to browse · max 20MB"}
            </p>

            {/* Scan line on drag */}
            {isDragActive && (
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent top-1/2" />
            )}
          </div>
        )}
      </div>

      {/* ── EXIF Badge row ── */}
      {selectedFile && (exifPreview || loadingExif) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {loadingExif ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Reading metadata…</span>
            </div>
          ) : exifPreview ? (
            <>
              {exifPreview.hasGps ? (
                <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <MapPin className="w-2.5 h-2.5" />
                  GPS · {exifPreview.gpsLat?.toFixed(3)}, {exifPreview.gpsLng?.toFixed(3)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                  <MapPin className="w-2.5 h-2.5" /> No GPS
                </span>
              )}
              {exifPreview.camera && (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                  <Camera className="w-2.5 h-2.5" /> {exifPreview.camera}
                </span>
              )}
              {exifPreview.timestamp && (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600">
                  <Clock className="w-2.5 h-2.5" /> {exifPreview.timestamp}
                </span>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Analyze Button ── */}
      <button
        onClick={() => selectedFile && !isAnalyzing && onAnalyze(selectedFile)}
        disabled={!selectedFile || isAnalyzing}
        className={clsx(
          "relative w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden",
          selectedFile && !isAnalyzing
            ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98] btn-shimmer"
            : "bg-zinc-800/80 text-zinc-600 cursor-not-allowed border border-zinc-700/50"
        )}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
              <circle cx="11" cy="11" r="3" fill="currentColor" opacity="0.4"/>
            </svg>
            Detect Location
          </>
        )}
      </button>

      {!selectedFile && (
        <p className="text-center text-[11px] text-zinc-700">
          Best with outdoor photos · landmarks · street scenes
        </p>
      )}
    </div>
  );
}
