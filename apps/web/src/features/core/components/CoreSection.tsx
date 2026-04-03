import type { ReactNode } from "react";

interface CoreSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function CoreSection({ eyebrow, title, description, children }: CoreSectionProps) {
  return (
    <section
      style={{
        borderRadius: "24px",
        border: "1px solid rgba(28, 25, 23, 0.12)",
        background: "rgba(255, 255, 255, 0.88)",
        padding: "28px",
        boxShadow: "0 18px 50px rgba(28, 25, 23, 0.08)"
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#0f766e"
        }}
      >
        {eyebrow}
      </p>
      <h2 style={{ marginBottom: "8px", fontSize: "28px", lineHeight: 1.1 }}>{title}</h2>
      <p style={{ marginTop: 0, marginBottom: "24px", color: "#57534e", lineHeight: 1.6 }}>{description}</p>
      {children}
    </section>
  );
}
