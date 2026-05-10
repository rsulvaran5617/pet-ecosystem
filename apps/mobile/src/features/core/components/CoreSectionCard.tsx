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
        padding: 14,
        gap: 9,
        ...visualTokens.mobile.shadow
      }}
    >
      <View style={{ gap: 3 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "900",
            letterSpacing: 0,
            textTransform: "uppercase",
            color: colorTokens.accent
          }}
        >
          {eyebrow}
        </Text>
        <Text style={{ fontSize: 17, fontWeight: "900", lineHeight: 21, color: colorTokens.ink }}>{title}</Text>
        <Text style={{ fontSize: 11, fontWeight: "600", lineHeight: 16, color: colorTokens.muted }}>{description}</Text>
      </View>
      {children}
    </View>
  );
}
