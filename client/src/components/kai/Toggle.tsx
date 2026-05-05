// Toggle — gold-on knob, used throughout K.AI Settings + Ticker Detail
interface Props {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle({ on, onChange, disabled = false, ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className="relative rounded-full transition-colors shrink-0"
      style={{
        width: 36,
        height: 20,
        backgroundColor: on ? "var(--kai-gold)" : "var(--kai-border-light)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-all"
        style={{
          width: 16,
          height: 16,
          backgroundColor: on ? "var(--kai-bg)" : "var(--kai-text-muted)",
          left: on ? 18 : 2,
        }}
      />
    </button>
  );
}
