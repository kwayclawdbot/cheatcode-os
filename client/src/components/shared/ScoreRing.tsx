// CheatCode OS — ScoreRing Component
// Design: Circular SVG progress ring with color-coded conviction level
// Colors: Green (80+), Amber (60-79), Red (<60)

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

const sizeConfig = {
  sm: { dim: 44, stroke: 4, fontSize: "text-xs", labelSize: "text-[9px]" },
  md: { dim: 64, stroke: 5, fontSize: "text-base", labelSize: "text-[10px]" },
  lg: { dim: 96, stroke: 6, fontSize: "text-2xl", labelSize: "text-xs" },
  xl: { dim: 140, stroke: 8, fontSize: "text-4xl", labelSize: "text-sm" },
};

function getScoreColor(score: number) {
  if (score >= 80) return "#12B76A";
  if (score >= 60) return "#F79009";
  return "#F04438";
}

function getConfidenceLabel(score: number) {
  if (score >= 90) return "Critical";
  if (score >= 75) return "High";
  if (score >= 60) return "Watch";
  return "Low";
}

export function ScoreRing({ score, size = "md", showLabel = true }: ScoreRingProps) {
  const { dim, stroke, fontSize, labelSize } = sizeConfig[size];
  const radius = (dim - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const label = getConfidenceLabel(score);
  const cx = dim / 2;
  const cy = dim / 2;

  return (
    <div className="relative inline-flex items-center justify-center flex-col">
      <svg width={dim} height={dim} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={stroke}
          className="score-ring-track"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`score-number font-bold leading-none ${fontSize}`}
          style={{ color }}
        >
          {score}
        </span>
        {showLabel && (
          <span className={`${labelSize} text-[#667085] font-medium mt-0.5`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
