import type { ReactNode } from "react";
import { colorTokens, visualTokens } from "@pet/ui";
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
        borderRadius: visualTokens.mobile.sectionRadius,
        borderWidth: 1,
        borderColor: colorTokens.line,
        backgroundColor: "rgba(255,255,255,0.96)",
        padding: 20,
        gap: 16,
        ...visualTokens.mobile.shadow
      }}
    >
      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colorTokens.accent
          }}
        >
          {eyebrow}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colorTokens.ink }}>{title}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colorTokens.muted }}>{description}</Text>
      </View>
      {children}
    </View>
  );
}
