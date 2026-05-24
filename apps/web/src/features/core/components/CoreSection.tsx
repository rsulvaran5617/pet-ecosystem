import type { ReactNode } from "react";

interface CoreSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  density?: "default" | "compact";
}

export function CoreSection({ children, density = "default", description, eyebrow, title }: CoreSectionProps) {
  const isCompact = density === "compact";

  return (
    <section
      style={{
        borderRadius: isCompact ? "18px" : "24px",
        border: "1px solid rgba(28, 25, 23, 0.12)",
        background: "rgba(255, 255, 255, 0.88)",
        padding: isCompact ? "18px" : "28px",
        boxShadow: isCompact ? "0 12px 34px rgba(28, 25, 23, 0.06)" : "0 18px 50px rgba(28, 25, 23, 0.08)"
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: isCompact ? "9px" : "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#0f766e"
        }}
      >
        {eyebrow}
      </p>
      <h2 style={{ marginBottom: isCompact ? "5px" : "8px", fontSize: isCompact ? "20px" : "28px", lineHeight: 1.1 }}>{title}</h2>
      <p style={{ marginTop: 0, marginBottom: isCompact ? "14px" : "24px", color: "#57534e", fontSize: isCompact ? "11px" : undefined, lineHeight: 1.45 }}>{description}</p>
      {children}
    </section>
  );
}
