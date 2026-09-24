import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

/** Muestra una notificación de Windows. Devuelve false si el sistema no lo permite. */
export async function notify(title: string, body: string): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  if (granted) sendNotification({ title, body });
  return granted;
}
