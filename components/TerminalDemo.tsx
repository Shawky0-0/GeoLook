"use client";

import { useEffect, useState } from "react";

type Line = { cmd: string; result: string };
type Session = { location: string; flag: string; confidence: number; color: string; lines: Line[] };

const SESSIONS: Session[] = [
  {
    location: "Rome, Italy", flag: "🇮🇹", confidence: 97, color: "#4ade80",
    lines: [
      { cmd: "scanning architecture", result: "Baroque & Renaissance facades" },
      { cmd: "reading signage",        result: "Latin + Italian script confirmed" },
      { cmd: "vegetation check",       result: "Maritime pine, Mediterranean flora" },
      { cmd: "landmark match",         result: "Colosseum geometry — hit ✓" },
    ],
  },
  {
    location: "Tokyo, Japan", flag: "🇯🇵", confidence: 94, color: "#f472b6",
    lines: [
      { cmd: "scanning architecture", result: "Ultramodern towers + shrine hybrid" },
      { cmd: "reading signage",        result: "Kanji & Hiragana detected" },
      { cmd: "density analysis",       result: "Extreme urban grid, 6,200/km²" },
      { cmd: "climate markers",        result: "Humid subtropical, 78% humidity" },
    ],
  },
  {
    location: "Moscow, Russia", flag: "🇷🇺", confidence: 91, color: "#fb923c",
    lines: [
      { cmd: "scanning architecture", result: "Soviet-era + Orthodox domes blended" },
      { cmd: "reading signage",        result: "Cyrillic script — Russian language" },
      { cmd: "climate analysis",       result: "Humid continental, sub-zero markers" },
      { cmd: "landmark match",         result: "Kremlin onion domes — hit ✓" },
    ],
  },
  {
    location: "Cairo, Egypt", flag: "🇪🇬", confidence: 95, color: "#fbbf24",
    lines: [
      { cmd: "scanning architecture", result: "Islamic + Pharaonic stonework" },
      { cmd: "reading signage",        result: "Arabic (right-to-left) confirmed" },
      { cmd: "terrain analysis",       result: "Arid desert, Nile delta proximity" },
      { cmd: "landmark match",         result: "Great Pyramid ratio — hit ✓" },
    ],
  },
  {
    location: "New York, USA", flag: "🇺🇸", confidence: 98, color: "#60a5fa",
    lines: [
      { cmd: "scanning architecture", result: "Art Deco + modernist glass towers" },
      { cmd: "reading signage",        result: "English, Latin alphabet, MPH units" },
      { cmd: "urban grid analysis",    result: "Rectangular block grid, numbered streets" },
      { cmd: "landmark match",         result: "Empire State silhouette — hit ✓" },
    ],
  },
  {
    location: "Istanbul, Turkey", flag: "🇹🇷", confidence: 93, color: "#c084fc",
    lines: [
      { cmd: "scanning architecture", result: "Ottoman mosques + Byzantine remnants" },
      { cmd: "reading signage",        result: "Turkish (Latin-based) script" },
      { cmd: "terrain analysis",       result: "Bosphorus strait water proximity" },
      { cmd: "landmark match",         result: "Hagia Sophia dome — hit ✓" },
    ],
  },
  {
    location: "Dubai, UAE", flag: "🇦🇪", confidence: 96, color: "#34d399",
    lines: [
      { cmd: "scanning architecture", result: "Hyper-modern glass + steel towers" },
      { cmd: "reading signage",        result: "Arabic + English bilingual signage" },
      { cmd: "climate analysis",       result: "Extreme arid desert, 43°C estimated" },
      { cmd: "landmark match",         result: "Burj Khalifa taper profile — hit ✓" },
    ],
  },
  {
    location: "Mumbai, India", flag: "🇮🇳", confidence: 89, color: "#f97316",
    lines: [
      { cmd: "scanning architecture", result: "British colonial Gothic + dense mix" },
      { cmd: "reading signage",        result: "Devanagari (Hindi) + English" },
      { cmd: "climate analysis",       result: "Tropical monsoon, 81% humidity" },
      { cmd: "terrain analysis",       result: "Coastal peninsula, dense urban" },
    ],
  },
  {
    location: "Seoul, South Korea", flag: "🇰🇷", confidence: 92, color: "#38bdf8",
    lines: [
      { cmd: "scanning architecture", result: "Hanok traditional + hypermodern towers" },
      { cmd: "reading signage",        result: "Hangul script (Korean) confirmed" },
      { cmd: "terrain analysis",       result: "Han River basin, mountain backdrop" },
      { cmd: "landmark match",         result: "N Seoul Tower silhouette — hit ✓" },
    ],
  },
  {
    location: "Buenos Aires, Argentina", flag: "🇦🇷", confidence: 88, color: "#a78bfa",
    lines: [
      { cmd: "scanning architecture", result: "European colonial + French Beaux-Arts" },
      { cmd: "reading signage",        result: "Spanish (Latin script) detected" },
      { cmd: "urban grid analysis",    result: "Wide diagonal avenues, European grid" },
      { cmd: "climate markers",        result: "Humid subtropical, La Plata basin" },
    ],
  },
];

function Bar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(100), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex-1 mx-2 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(74,222,128,0.15)", minWidth: 40 }}>
      <div className="h-full rounded-full" style={{
        width: `${w}%`,
        background: "linear-gradient(90deg,#16a34a,#4ade80)",
        transition: "width 650ms cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

export default function TerminalDemo() {
  const [idx, setIdx] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [visible, setVisible] = useState(true);

  const LINE_STEP = 1050;

  useEffect(() => {
    const session = SESSIONS[idx];
    setVisible(true);
    setLineCount(0);
    setShowMatch(false);

    const ts: ReturnType<typeof setTimeout>[] = [];

    session.lines.forEach((_, i) => {
      ts.push(setTimeout(() => setLineCount(i + 1), 550 + i * LINE_STEP));
    });

    const matchAt = 550 + session.lines.length * LINE_STEP + 250;
    ts.push(setTimeout(() => setShowMatch(true), matchAt));

    const fadeAt = matchAt + 2400;
    ts.push(setTimeout(() => setVisible(false), fadeAt));
    ts.push(setTimeout(() => setIdx(n => (n + 1) % SESSIONS.length), fadeAt + 450));

    return () => ts.forEach(clearTimeout);
  }, [idx]);

  const session = SESSIONS[idx];

  return (
    <div
      className="w-full max-w-xl mx-auto rounded-2xl overflow-hidden"
      style={{
        background: "#06090a",
        border: "1px solid rgba(74,222,128,0.12)",
        boxShadow: "0 0 0 1px rgba(74,222,128,0.04), 0 24px 80px rgba(0,0,0,0.7)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.45s ease",
      }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(74,222,128,0.04)", borderBottom: "1px solid rgba(74,222,128,0.08)" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.6)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(234,179,8,0.6)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(74,222,128,0.7)" }} />
        </div>
        <p className="flex-1 text-center font-mono text-[10px]" style={{ color: "rgba(74,222,128,0.4)" }}>
          geolook — vision-engine@2.1
        </p>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[9px]" style={{ color: "rgba(74,222,128,0.5)" }}>LIVE</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 font-mono text-[11px] min-h-[230px] flex flex-col">

        {/* Prompt */}
        <div className="flex items-center gap-2 mb-4" style={{ color: "rgba(74,222,128,0.35)" }}>
          <span>$</span>
          <span>geolook analyze ./input.jpg --deep --geo</span>
          <span className="inline-block w-[7px] h-[13px] animate-pulse" style={{ background: "rgba(74,222,128,0.5)" }} />
        </div>

        {/* Lines */}
        <div className="space-y-2.5 flex-1">
          {session.lines.slice(0, lineCount).map((line, i) => (
            <div
              key={`${idx}-${i}`}
              className="flex items-center gap-1.5"
              style={{ animation: "tFadeIn 0.28s ease-out both" }}
            >
              <span style={{ color: "rgba(74,222,128,0.4)" }}>►</span>
              <span style={{ color: "rgba(74,222,128,0.65)", whiteSpace: "nowrap" }}>{line.cmd}</span>
              <Bar key={`${idx}-${i}-b`} />
              <span style={{ color: "#bbf7d0", whiteSpace: "nowrap" }}>{line.result}</span>
            </div>
          ))}
        </div>

        {/* Match */}
        {showMatch && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between"
            style={{
              background: `${session.color}0d`,
              border: `1px solid ${session.color}28`,
              animation: "tFadeIn 0.4s ease-out both",
            }}
          >
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(74,222,128,0.4)" }}>
                location identified
              </p>
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{session.flag}</span>
                <span className="text-sm font-bold" style={{ color: session.color }}>
                  {session.location}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.15em] mb-0.5" style={{ color: "rgba(74,222,128,0.4)" }}>
                confidence
              </p>
              <span className="text-2xl font-black" style={{ color: session.color }}>
                {session.confidence}%
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
