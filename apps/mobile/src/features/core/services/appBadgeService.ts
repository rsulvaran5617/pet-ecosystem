import * as Notifications from "expo-notifications";

export type AppBadgeSource = "owner" | "provider" | "foster" | "signed-out";

export async function setAppBadgeCount(count: number): Promise<"applied" | "unsupported"> {
  const normalizedCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));

  try {
    await Notifications.setBadgeCountAsync(normalizedCount);
    return "applied";
  } catch {
    // Android badge support depends on the launcher/manufacturer. The app should
    // keep working even when the platform ignores or rejects badge updates.
    return "unsupported";
  }
}

export async function clearAppBadgeCount() {
  return setAppBadgeCount(0);
}
