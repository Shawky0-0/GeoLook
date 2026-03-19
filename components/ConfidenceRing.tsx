"use client";

interface ConfidenceRingProps {
  confidence: number;
  size?: number;
}

function getColor(confidence: number) {
  if (confidence >= 80) return { stroke: "#22c55e", text: "#22c55e", label: "Very High" };
  if (confidence >= 60) return { stroke: "#4ade80", text: "#4ade80", label: "High" };
  if (confidence >= 40) return { stroke: "#facc15", text: "#facc15", label: "Moderate" };
  if (confidence >= 15) return { stroke: "#f87171", text: "#f87171", label: "Low" };
  return { stroke: "#ef4444", text: "#ef4444", label: "Very Low" };
}

export default function ConfidenceRing({ confidence, size = 96 }: ConfidenceRingProps) {
  const pct = Math.max(1, Math.min(100, confidence));
  const { stroke, text, label } = getColor(pct);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            strokeWidth={8}
            stroke="rgba(255,255,255,0.08)"
          />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            strokeWidth={8}
            stroke={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        </svg>

        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color: text }}
        >
          <span className="text-lg font-black leading-none tabular-nums">{pct}%</span>
        </div>
      </div>

      {/* Badge below ring */}
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          color: stroke,
          background: `${stroke}18`,
          border: `1px solid ${stroke}40`,
        }}
      >
        {label}
      </span>
    </div>
  );
}
