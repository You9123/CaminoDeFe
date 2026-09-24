import { useEffect } from "react";
import { getSetting, setSetting } from "../data/progressRepo";
import { notify } from "../data/notify";
import { gameDay } from "../domain/day";
import { reminderMessage, shouldRemind } from "../domain/reminder";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";

const CHECK_EVERY_MS = 60_000;

/**
 * Revisa cada minuto:
 * - si cambió el día con la app abierta, recarga el progreso (misiones y racha nuevas);
 * - si toca, muestra el recordatorio diario.
 */
export function useDailyReminder() {
  useEffect(() => {
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const settings = useSettings.getState();
        if (!settings.loaded) return;
        const today = gameDay();
        if (useProgress.getState().day !== today) await useProgress.getState().refresh();

        const { streak } = useProgress.getState();
        const lastRemindedDay = await getSetting("reminder_last_day");
        if (
          shouldRemind({
            enabled: settings.reminderEnabled,
            time: settings.reminderTime,
            now: new Date(),
            today,
            todayDone: streak.todayDone,
            lastRemindedDay,
          })
        ) {
          await setSetting("reminder_last_day", today);
          await notify("Camino de Fe", reminderMessage(today, streak.current));
        }
      } catch (e) {
        console.error("Recordatorio:", e);
      } finally {
        running = false;
      }
    };
    const id = window.setInterval(tick, CHECK_EVERY_MS);
    return () => window.clearInterval(id);
  }, []);
}
