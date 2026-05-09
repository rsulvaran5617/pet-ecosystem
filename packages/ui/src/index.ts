export const colorTokens = {
  canvas: "#fbfaf7",
  canvasWarm: "#f7f2e7",
  surface: "#ffffff",
  surfaceSoft: "#fffdf8",
  ink: "#101828",
  muted: "#5f6675",
  mutedStrong: "#374151",
  line: "rgba(16,24,40,0.1)",
  accent: "#00978f",
  accentDark: "#00847d",
  accentSoft: "#e6f7f5",
  success: "#16a36a",
  successSoft: "#dcfce7",
  warning: "#f97316",
  warningSoft: "#ffedd5",
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  purple: "#7c3aed",
  purpleSoft: "#ede9fe",
  blue: "#2563eb",
  blueSoft: "#dbeafe",
  admin: "#06264b",
  adminSurface: "#071f3d",
  adminAccent: "#008a97"
} as const;

export const spacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radiusTokens = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999
} as const;

export const visualTokens = {
  mobile: {
    screenPadding: 20,
    cardRadius: 18,
    sectionRadius: 24,
    shadow: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 22,
      elevation: 4
    },
    softShadow: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2
    }
  },
  web: {
    shellBackground: "#f8fafc",
    cardShadow: "0 14px 40px rgba(15,23,42,0.08)",
    softShadow: "0 8px 24px rgba(15,23,42,0.06)"
  }
} as const;
