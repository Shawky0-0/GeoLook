"use client";

import { clsx } from "clsx";

interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

function getConfidenceTier(confidence: number): {
  label: string;
  color: string;
  bgColor: string;
  barColor: string;
} {
  if (confidence >= 80) {
    return {
      label: "Very High",
      color: "text-green-400",
      bgColor: "bg-green-500/10 border-green-500/20",
      barColor: "bg-green-500",
    };
  } else if (confidence >= 60) {
    return {
      label: "High",
      color: "text-green-500",
      bgColor: "bg-green-500/10 border-green-500/20",
      barColor: "bg-green-400",
    };
  } else if (confidence >= 40) {
    return {
      label: "Moderate",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/20",
      barColor: "bg-yellow-400",
    };
  } else if (confidence >= 15) {
    return {
      label: "Low",
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
      barColor: "bg-red-500",
    };
  } else {
    return {
      label: "Very Low",
      color: "text-red-500",
      bgColor: "bg-red-500/10 border-red-500/20",
      barColor: "bg-red-600",
    };
  }
}

export default function ConfidenceBar({
  confidence,
  showLabel = true,
  size = "md",
}: ConfidenceBarProps) {
  const displayConfidence = Math.max(1, Math.min(100, confidence));
  const tier = getConfidenceTier(displayConfidence);

  if (displayConfidence < 5) {
    return (
      <span className="text-xs text-zinc-500 italic">Unable to determine</span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div
          className={clsx(
            "relative flex-1 rounded-full overflow-hidden",
            size === "sm" ? "h-1.5" : "h-2",
            "bg-zinc-800"
          )}
        >
          <div
            className={clsx(
              "absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out",
              tier.barColor
            )}
            style={{ width: `${displayConfidence}%` }}
          />
        </div>
        <span
          className={clsx(
            "font-semibold tabular-nums shrink-0",
            tier.color,
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {displayConfidence}%
        </span>
      </div>

      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
              tier.bgColor,
              tier.color
            )}
          >
            {tier.label} Confidence
          </span>
        </div>
      )}
    </div>
  );
}
