import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const STORAGE_KEY_PREFIX = "pet-ecosystem:reminder-notification:";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true
  })
});

export type ReminderNotificationStatus = "active" | "past" | "permission-denied" | "saved-only" | "unsupported";

function getStorageKey(reminderId: string) {
  return `${STORAGE_KEY_PREFIX}${reminderId}`;
}

async function getStoredNotificationId(reminderId: string) {
  return AsyncStorage.getItem(getStorageKey(reminderId));
}

export async function cancelReminderNotification(reminderId: string) {
  const notificationId = await getStoredNotificationId(reminderId);

  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await AsyncStorage.removeItem(getStorageKey(reminderId));
  }
}

export async function scheduleReminderNotification({
  body,
  dueAt,
  petName,
  reminderId,
  title
}: {
  body?: string | null;
  dueAt: string;
  petName?: string | null;
  reminderId: string;
  title: string;
}): Promise<ReminderNotificationStatus> {
  const triggerDate = new Date(dueAt);

  await cancelReminderNotification(reminderId);

  if (Number.isNaN(triggerDate.getTime())) {
    return "saved-only";
  }

  if (triggerDate.getTime() <= Date.now()) {
    return "past";
  }

  try {
    const existingPermissions = await Notifications.getPermissionsAsync();
    const finalPermissions = existingPermissions.granted ? existingPermissions : await Notifications.requestPermissionsAsync();

    if (!finalPermissions.granted) {
      return "permission-denied";
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        body: body?.trim() || title,
        data: { reminderId },
        title: petName ? `Recordatorio de ${petName}` : "Recordatorio de cuidado"
      },
      trigger: triggerDate
    });

    await AsyncStorage.setItem(getStorageKey(reminderId), notificationId);

    return "active";
  } catch {
    return "unsupported";
  }
}
