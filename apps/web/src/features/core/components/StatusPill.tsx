interface StatusPillProps {
  tone: "active" | "pending" | "neutral";
  label: string;
}

const palette = {
  active: {
    background: "rgba(15, 118, 110, 0.12)",
    border: "rgba(15, 118, 110, 0.24)",
    color: "#0f766e"
  },
  pending: {
    background: "rgba(180, 83, 9, 0.12)",
    border: "rgba(180, 83, 9, 0.24)",
    color: "#b45309"
  },
  neutral: {
    background: "rgba(68, 64, 60, 0.08)",
    border: "rgba(68, 64, 60, 0.14)",
    color: "#44403c"
  }
} as const;

export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        border: `1px solid ${palette[tone].border}`,
        background: palette[tone].background,
        color: palette[tone].color,
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "6px 10px"
      }}
    >
      {label}
    </span>
  );
}
