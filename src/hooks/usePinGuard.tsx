import { useState } from "react";
import { PinPrompt } from "../components/PinLock";
import { usePin } from "../stores/pinStore";

/**
 * Para acciones que muestran el diario fuera de él (exportar el respaldo): si hay PIN y el diario
 * está cerrado, primero lo pide. Devuelve la función para pedirlo y la ventana a mostrar.
 */
export function usePinGuard(title: string, message: string) {
  const [pending, setPending] = useState<null | (() => void)>(null);
  const guard = (action: () => void) => {
    const { enabled, unlocked } = usePin.getState();
    if (!enabled || unlocked) action();
    else setPending(() => action);
  };
  const prompt = pending ? (
    <PinPrompt title={title} message={message} onConfirm={pending} onClose={() => setPending(null)} />
  ) : null;
  return { guard, prompt };
}
