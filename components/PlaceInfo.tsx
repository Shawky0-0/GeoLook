"use client";

import { useState } from "react";
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { WikiInfo } from "@/lib/wikipedia";

interface PlaceInfoProps {
  info: WikiInfo;
}

const EXTRACT_LIMIT = 300;

export default function PlaceInfo({ info }: PlaceInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = info.extract.length > EXTRACT_LIMIT;
  const displayText =
    isLong && !expanded ? info.extract.slice(0, EXTRACT_LIMIT).trimEnd() + "…" : info.extract;

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-xl animate-fade-in">
      {/* Amber/gold top strip */}
      <div className="h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400" />

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-100">About this Place</h2>
        <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
          Wikipedia
        </span>
      </div>

      <div className="p-5">
        <div className="flex gap-4">
          {/* Thumbnail */}
          {info.thumbnail && (
            <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-white/10 bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-tight">{info.title}</h3>
            {info.description && (
              <p className="text-xs text-amber-400/80 mt-0.5 font-medium">{info.description}</p>
            )}
          </div>
        </div>

        {/* Extract */}
        <div className="mt-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{displayText}</p>

          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Read more
                </>
              )}
            </button>
          )}
        </div>

        {/* Wikipedia link */}
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all duration-200"
        >
          <ExternalLink className="w-3 h-3" />
          View on Wikipedia
        </a>
      </div>
    </div>
  );
}
