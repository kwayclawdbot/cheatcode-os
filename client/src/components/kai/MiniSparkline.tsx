// MiniSparkline — inline polyline for list rows.
// Wraps the existing intelligence/SparklineChart but in a tighter container
// styled to match the mockup.
import { SparklineChart } from "@/components/intelligence/SparklineChart";

interface Props {
  symbol: string;
  positive: boolean;
  width?: number;
  height?: number;
}

export function MiniSparkline({ symbol, positive, width = 44, height = 16 }: Props) {
  // Use kai theme colors via CSS computed style
  const color = positive
    ? "var(--kai-green)"
    : "var(--kai-red)";
  // SparklineChart accepts a string color directly (gets baked into the SVG).
  // CSS variables don't resolve inside SVG attributes, so reach for the
  // computed value if needed. Simpler: pass a deterministic hex per side.
  const hex = positive ? "#5FBA8A" : "#C97A6E"; // mockup palette; close enough in light mode too
  void color;
  return <SparklineChart symbol={symbol} color={hex} width={width} height={height} />;
}
