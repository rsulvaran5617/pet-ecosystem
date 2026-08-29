export const betaPlatforms = ["android", "ios", "web"] as const;

export type BetaPlatform = (typeof betaPlatforms)[number];

export const betaTrackingKeys = [
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term"
] as const;

export type BetaTrackingKey = (typeof betaTrackingKeys)[number];
export type BetaTrackingParams = Partial<Record<BetaTrackingKey, string>>;

export interface BetaPlatformConfig {
  description: string;
  eyebrow: string;
  label: string;
  platform: BetaPlatform;
  url?: string;
}

const getBetaDestination = (platform: BetaPlatform): string | undefined => {
  const value = {
    android: process.env.NEXT_PUBLIC_ANDROID_BETA_URL,
    ios: process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL,
    web: process.env.NEXT_PUBLIC_WEB_APP_URL
  }[platform]?.trim();

  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

export const getBetaPlatformConfigs = (): BetaPlatformConfig[] => [
  {
    platform: "android",
    eyebrow: "Android",
    label: "Descargar Android Beta",
    description: "Instala la versión de prueba mediante Firebase App Distribution.",
    url: getBetaDestination("android")
  },
  {
    platform: "ios",
    eyebrow: "iPhone",
    label: "Instalar en iPhone con TestFlight",
    description: "Abre TestFlight para instalar la beta privada en tu iPhone.",
    url: getBetaDestination("ios")
  },
  {
    platform: "web",
    eyebrow: "Navegador",
    label: "Entrar a la versión Web",
    description: "Prueba Pet Ecosystem desde un navegador compatible.",
    url: getBetaDestination("web")
  }
];

export const isBetaPlatform = (value: string): value is BetaPlatform =>
  betaPlatforms.some((platform) => platform === value);

export const readBetaTrackingParams = (
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams
): BetaTrackingParams => {
  const result: BetaTrackingParams = {};

  for (const key of betaTrackingKeys) {
    const rawValue =
      searchParams instanceof URLSearchParams ? searchParams.get(key) : searchParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const normalized = value?.trim().slice(0, 160);

    if (normalized) result[key] = normalized;
  }

  return result;
};

export const appendBetaTrackingParams = (
  destination: string,
  trackingParams: BetaTrackingParams
): string => {
  const url = new URL(destination);

  for (const [key, value] of Object.entries(trackingParams)) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
};

export const buildBetaRouteHref = (
  platform: BetaPlatform,
  trackingParams: BetaTrackingParams
): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(trackingParams)) {
    if (value) query.set(key, value);
  }

  const serialized = query.toString();
  return `/beta/${platform}${serialized ? `?${serialized}` : ""}`;
};
