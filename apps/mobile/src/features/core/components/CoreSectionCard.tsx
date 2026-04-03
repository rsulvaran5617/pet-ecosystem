import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface CoreSectionCardProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function CoreSectionCard({ eyebrow, title, description, children }: CoreSectionCardProps) {
  return (
    <View
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(28, 25, 23, 0.1)",
        backgroundColor: "rgba(255,255,255,0.92)",
        padding: 20,
        gap: 16
      }}
    >
      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#0f766e"
          }}
        >
          {eyebrow}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#1c1917" }}>{title}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "#57534e" }}>{description}</Text>
      </View>
      {children}
    </View>
  );
}
