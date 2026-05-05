// ChangePercent — colored percent delta
interface Props {
  value: number;
  size?: "xs" | "sm" | "lg";
}

export function ChangePercent({ value, size = "sm" }: Props) {
  const cls =
    size === "lg" ? "text-sm" : size === "xs" ? "text-[10px]" : "text-[11px]";
  const color = value >= 0 ? "var(--kai-green)" : "var(--kai-red)";
  return (
    <span className={`font-mono tabular-nums ${cls}`} style={{ color }}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
